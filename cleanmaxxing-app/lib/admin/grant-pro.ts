import 'server-only';

import { createServiceClient } from '@/lib/supabase/server';

// Shared grant/revoke logic backing both the admin UI (/admin/access)
// and the CLI script (scripts/grant-premium.ts). Bypasses Stripe — sets
// subscription_status='active' for grant or 'canceled' for revoke, and
// writes audit fields (who, when, why) so comped users are
// distinguishable from paying subscribers.

export type GrantResult =
  | { ok: true; userId: string; previousStatus: string | null }
  | { ok: false; error: string };

// Resolves an email-or-UUID target string into a public.users.id by
// looking up auth.users first (when given email). Returns null when no
// match. Uses the service client so the lookup works even when the
// caller's RLS doesn't grant read access on auth.users.
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function resolveTargetUserId(
  target: string,
): Promise<string | null> {
  const trimmed = target.trim();
  if (UUID_RE.test(trimmed)) return trimmed;

  const supabase = createServiceClient();
  // auth.admin.listUsers paginates; iterate until we find the email or
  // exhaust the list. Tester volume is low so this is fine.
  const PAGE = 200;
  for (let page = 1; page < 50; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: PAGE,
    });
    if (error) return null;
    const match = data.users.find(
      (u) => u.email?.toLowerCase() === trimmed.toLowerCase(),
    );
    if (match) return match.id;
    if (data.users.length < PAGE) return null;
  }
  return null;
}

export async function grantPro(
  userId: string,
  grantedByEmail: string,
  reason: string | null,
): Promise<GrantResult> {
  const supabase = createServiceClient();

  const { data: before } = await supabase
    .from('users')
    .select('subscription_status')
    .eq('id', userId)
    .maybeSingle();
  if (!before) {
    return { ok: false, error: 'No public.users row for that user.' };
  }

  const { error } = await supabase
    .from('users')
    .update({
      subscription_status: 'active',
      pro_granted_at: new Date().toISOString(),
      pro_granted_by_email: grantedByEmail,
      pro_grant_reason: reason && reason.trim().length > 0 ? reason.trim() : null,
      // Clearing the revoke fields on a fresh grant — the latest pair
      // reflects current state. Full history would need a separate
      // subscription_grants table.
      pro_revoked_at: null,
      pro_revoked_by_email: null,
    })
    .eq('id', userId);
  if (error) return { ok: false, error: error.message };

  return {
    ok: true,
    userId,
    previousStatus: (before.subscription_status as string | null) ?? null,
  };
}

export async function revokePro(
  userId: string,
  revokedByEmail: string,
): Promise<GrantResult> {
  const supabase = createServiceClient();

  const { data: before } = await supabase
    .from('users')
    .select('subscription_status')
    .eq('id', userId)
    .maybeSingle();
  if (!before) {
    return { ok: false, error: 'No public.users row for that user.' };
  }

  const { error } = await supabase
    .from('users')
    .update({
      subscription_status: 'canceled',
      pro_revoked_at: new Date().toISOString(),
      pro_revoked_by_email: revokedByEmail,
    })
    .eq('id', userId);
  if (error) return { ok: false, error: error.message };

  return {
    ok: true,
    userId,
    previousStatus: (before.subscription_status as string | null) ?? null,
  };
}

export type RecentGrantRow = {
  userId: string;
  email: string | null;
  subscriptionStatus: string | null;
  grantedAt: string | null;
  grantedByEmail: string | null;
  grantReason: string | null;
  revokedAt: string | null;
  revokedByEmail: string | null;
};

// Lists the most-recent grants (active or revoked) for the
// /admin/access table. Email is joined from auth.users via the service
// client. Limit 25 — admin volume stays small.
export async function listRecentGrants(): Promise<RecentGrantRow[]> {
  const supabase = createServiceClient();
  const { data: rows } = await supabase
    .from('users')
    .select(
      'id, subscription_status, pro_granted_at, pro_granted_by_email, pro_grant_reason, pro_revoked_at, pro_revoked_by_email',
    )
    .not('pro_granted_at', 'is', null)
    .order('pro_granted_at', { ascending: false })
    .limit(25);
  if (!rows || rows.length === 0) return [];

  // Pull emails for the granted users. listUsers + filter is wasteful
  // at scale, but with the limit=25 the admin set is tiny. If grant
  // counts grow past a few hundred lifetime, swap to a single
  // auth.users join via a view.
  const ids = new Set(rows.map((r) => r.id as string));
  const emails = new Map<string, string>();
  const PAGE = 200;
  for (let page = 1; page < 50; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: PAGE,
    });
    if (error) break;
    for (const u of data.users) {
      if (ids.has(u.id) && u.email) emails.set(u.id, u.email);
    }
    if (data.users.length < PAGE) break;
    if (emails.size === ids.size) break;
  }

  return rows.map((r) => ({
    userId: r.id as string,
    email: emails.get(r.id as string) ?? null,
    subscriptionStatus: (r.subscription_status as string | null) ?? null,
    grantedAt: (r.pro_granted_at as string | null) ?? null,
    grantedByEmail: (r.pro_granted_by_email as string | null) ?? null,
    grantReason: (r.pro_grant_reason as string | null) ?? null,
    revokedAt: (r.pro_revoked_at as string | null) ?? null,
    revokedByEmail: (r.pro_revoked_by_email as string | null) ?? null,
  }));
}
