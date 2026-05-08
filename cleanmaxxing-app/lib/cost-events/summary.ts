// Cost-events aggregation helpers for the admin dashboard.
//
// All queries hit cost_events via the service client (RLS denies all
// reads otherwise). The dashboard auth gate (lib/admin/is-admin.ts)
// is the load-bearing access control — these helpers run with full
// table access by design.
//
// Estimates are returned in cents to keep math integer-clean; the
// dashboard formats to dollars at render time.

import { createServiceClient } from '@/lib/supabase/server';

export type CostWindow = 7 | 30 | 90;

export type TotalsRow = {
  events: number;
  cents: number;
  // Distinct users over the window — the auth.users join is implicit
  // via the user_id column. Anonymous events (user_id null) get
  // counted once in the 'anonymous' bucket but don't count toward
  // distinct_users.
  distinct_users: number;
};

export type FeatureRow = {
  feature: string;
  events: number;
  cents: number;
};

export type KindRow = {
  kind: string;
  events: number;
  cents: number;
  tokens_input: number;
  tokens_output: number;
  units: number;
};

function windowStartIso(days: CostWindow): string {
  const d = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return d.toISOString();
}

export async function getCostTotals(
  windowDays: CostWindow,
): Promise<TotalsRow> {
  const service = createServiceClient();
  const since = windowStartIso(windowDays);
  // One-shot fetch; aggregation in JS. cost_events rows are small
  // (<200 bytes each) and a 90-day window for a beta-stage app fits
  // comfortably under any reasonable response cap. Move to an RPC if
  // this grows past ~50k rows.
  const { data, error } = await service
    .from('cost_events')
    .select('user_id, estimated_cents')
    .gte('occurred_at', since);
  if (error) throw error;
  const rows = (data ?? []) as Array<{
    user_id: string | null;
    estimated_cents: number;
  }>;
  const userIds = new Set<string>();
  let cents = 0;
  for (const r of rows) {
    cents += r.estimated_cents;
    if (r.user_id) userIds.add(r.user_id);
  }
  return {
    events: rows.length,
    cents,
    distinct_users: userIds.size,
  };
}

export async function getCostByFeature(
  windowDays: CostWindow,
): Promise<FeatureRow[]> {
  const service = createServiceClient();
  const since = windowStartIso(windowDays);
  const { data, error } = await service
    .from('cost_events')
    .select('feature, estimated_cents')
    .gte('occurred_at', since);
  if (error) throw error;
  const rows = (data ?? []) as Array<{
    feature: string | null;
    estimated_cents: number;
  }>;
  const byFeature = new Map<string, FeatureRow>();
  for (const r of rows) {
    const key = r.feature ?? '(unspecified)';
    const prior = byFeature.get(key) ?? { feature: key, events: 0, cents: 0 };
    prior.events += 1;
    prior.cents += r.estimated_cents;
    byFeature.set(key, prior);
  }
  return Array.from(byFeature.values()).sort((a, b) => b.cents - a.cents);
}

export async function getCostByKind(windowDays: CostWindow): Promise<KindRow[]> {
  const service = createServiceClient();
  const since = windowStartIso(windowDays);
  const { data, error } = await service
    .from('cost_events')
    .select('kind, estimated_cents, tokens_input, tokens_output, units')
    .gte('occurred_at', since);
  if (error) throw error;
  const rows = (data ?? []) as Array<{
    kind: string;
    estimated_cents: number;
    tokens_input: number | null;
    tokens_output: number | null;
    units: number | null;
  }>;
  const byKind = new Map<string, KindRow>();
  for (const r of rows) {
    const prior = byKind.get(r.kind) ?? {
      kind: r.kind,
      events: 0,
      cents: 0,
      tokens_input: 0,
      tokens_output: 0,
      units: 0,
    };
    prior.events += 1;
    prior.cents += r.estimated_cents;
    prior.tokens_input += r.tokens_input ?? 0;
    prior.tokens_output += r.tokens_output ?? 0;
    prior.units += r.units ?? 0;
    byKind.set(r.kind, prior);
  }
  return Array.from(byKind.values()).sort((a, b) => b.cents - a.cents);
}

export function formatCents(cents: number): string {
  if (cents < 100) return `${cents}¢`;
  return `$${(cents / 100).toFixed(2)}`;
}
