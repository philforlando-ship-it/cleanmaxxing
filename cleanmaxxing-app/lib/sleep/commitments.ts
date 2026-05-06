// Adherence layer for the sleep plan. Derives 1-3 daily commitments
// from the assessment answers (biggest_blockers + what_tried) using
// rule-based mapping — no LLM call. Re-derivation on assessment save
// is idempotent: each rule has a stable source_key, so logs FK'd to
// the commitment row stay valid across re-derivations.
//
// Design choices:
//   - Rule-based, not LLM-generated. Deterministic, free, auditable.
//   - source_key is stable per rule. Re-derivation upserts on
//     (user_id, source_key); existing logs survive.
//   - Inactive commitments are kept (active=false), not deleted —
//     preserves history when the user changes blockers.
//   - Cap display at 3. More dilutes the daily-action signal.
//   - Fallback rule fires only when no blocker-driven rule fires, so
//     a user who picked 'nothing_obvious' as the only blocker still
//     gets a commitment ("Log last night's sleep") tied to the
//     existing tracker.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { SleepAssessment } from './types';

const MAX_ACTIVE_COMMITMENTS = 3;

export type SleepCommitment = {
  id: string;
  user_id: string;
  text: string;
  source_key: string;
  display_order: number;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type SleepCommitmentLog = {
  id: string;
  user_id: string;
  commitment_id: string;
  app_day: string;
  completed: boolean;
  created_at: string;
  updated_at: string;
};

// =====================
// Derivation rules
// =====================

type CommitmentRule = {
  source_key: string;
  text: string;
  // Lower = appears first on the tile.
  display_order: number;
  // Returns true when this rule should produce an active commitment
  // for the given assessment.
  shouldApply: (a: SleepAssessment) => boolean;
  // When true, this rule only applies if no blocker-driven rule
  // applied. Used for the always-on "log sleep" anchor.
  isFallback?: boolean;
};

const RULES: CommitmentRule[] = [
  {
    source_key: 'screens_late',
    text: 'No screens 30 minutes before bed',
    display_order: 10,
    shouldApply: (a) =>
      a.biggest_blockers.includes('screens_late') &&
      !a.what_tried.includes('screen_cutoffs'),
  },
  {
    source_key: 'caffeine_late',
    text: 'No caffeine after noon',
    display_order: 20,
    shouldApply: (a) =>
      a.biggest_blockers.includes('caffeine_late') &&
      !a.what_tried.includes('caffeine_cutoffs'),
  },
  {
    source_key: 'evening_alcohol',
    text: 'No alcohol on weeknights',
    display_order: 30,
    shouldApply: (a) => a.biggest_blockers.includes('evening_alcohol'),
  },
  {
    source_key: 'late_exercise',
    text: 'No workouts within 2 hours of bed',
    display_order: 40,
    shouldApply: (a) => a.biggest_blockers.includes('late_exercise'),
  },
  {
    source_key: 'wind_down',
    text: '10-minute pre-bed wind-down (dim lights, write tomorrow’s three things)',
    display_order: 50,
    shouldApply: (a) =>
      a.biggest_blockers.includes('racing_thoughts') &&
      !a.what_tried.includes('mindfulness_breathing'),
  },
  {
    source_key: 'environment_temp',
    text: 'Bedroom at 65–68°F overnight',
    display_order: 60,
    shouldApply: (a) => a.biggest_blockers.includes('environment'),
  },
  {
    source_key: 'log_sleep',
    text: 'Log last night’s sleep',
    display_order: 100,
    shouldApply: () => true,
    isFallback: true,
  },
];

export type DerivedCommitment = {
  source_key: string;
  text: string;
  display_order: number;
};

// Pure function. Returns the commitments that should be active for
// the given assessment, capped at MAX_ACTIVE_COMMITMENTS. Fallback
// rules apply only when no non-fallback rule fired.
export function deriveCommitments(
  assessment: SleepAssessment,
): DerivedCommitment[] {
  const primary = RULES.filter(
    (r) => !r.isFallback && r.shouldApply(assessment),
  );
  const out =
    primary.length > 0
      ? primary
      : RULES.filter((r) => r.isFallback && r.shouldApply(assessment));

  return out
    .slice(0, MAX_ACTIVE_COMMITMENTS)
    .map((r) => ({
      source_key: r.source_key,
      text: r.text,
      display_order: r.display_order,
    }));
}

// =====================
// CRUD + sync
// =====================

export async function listActiveCommitments(
  supabase: SupabaseClient,
  userId: string,
): Promise<SleepCommitment[]> {
  const { data, error } = await supabase
    .from('sleep_commitments')
    .select('*')
    .eq('user_id', userId)
    .eq('active', true)
    .order('display_order', { ascending: true });
  if (error) throw error;
  return (data ?? []) as SleepCommitment[];
}

// Re-derive commitments from the current assessment and reconcile the
// sleep_commitments table:
//   - upsert each derived commitment by (user_id, source_key)
//   - flip any existing active commitment whose source_key isn't in
//     the new derived set to active=false
// Logs FK to commitment.id, so source_key-stable upserts preserve the
// user's adherence history across re-derivations.
export async function reconcileCommitmentsForAssessment(
  supabase: SupabaseClient,
  userId: string,
  assessment: SleepAssessment,
): Promise<void> {
  const derived = deriveCommitments(assessment);
  const derivedKeys = new Set(derived.map((d) => d.source_key));

  // Upsert derived commitments. ON CONFLICT (user_id, source_key) the
  // existing row's id is preserved — log history stays intact.
  if (derived.length > 0) {
    const rows = derived.map((d) => ({
      user_id: userId,
      source_key: d.source_key,
      text: d.text,
      display_order: d.display_order,
      active: true,
      updated_at: new Date().toISOString(),
    }));
    const { error: upErr } = await supabase
      .from('sleep_commitments')
      .upsert(rows, { onConflict: 'user_id,source_key' });
    if (upErr) throw upErr;
  }

  // Soft-deactivate any existing active row whose source_key isn't in
  // the new derived set.
  const { data: existing } = await supabase
    .from('sleep_commitments')
    .select('id, source_key')
    .eq('user_id', userId)
    .eq('active', true);
  const toDeactivate = ((existing ?? []) as Array<{
    id: string;
    source_key: string;
  }>).filter((row) => !derivedKeys.has(row.source_key));

  if (toDeactivate.length > 0) {
    const { error: deactErr } = await supabase
      .from('sleep_commitments')
      .update({ active: false, updated_at: new Date().toISOString() })
      .in(
        'id',
        toDeactivate.map((r) => r.id),
      );
    if (deactErr) throw deactErr;
  }
}

// =====================
// Per-day logs
// =====================

// Toggle today's completion for a single commitment. Upsert keyed on
// (commitment_id, app_day). Returns the resulting log row so the
// client can render the new state without refetching.
export async function setCommitmentLog(
  supabase: SupabaseClient,
  userId: string,
  commitmentId: string,
  appDay: string,
  completed: boolean,
): Promise<SleepCommitmentLog> {
  const row = {
    user_id: userId,
    commitment_id: commitmentId,
    app_day: appDay,
    completed,
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await supabase
    .from('sleep_commitment_logs')
    .upsert(row, { onConflict: 'commitment_id,app_day' })
    .select('*')
    .single();
  if (error) throw error;
  return data as SleepCommitmentLog;
}

// Today-tile state: active commitments + each one's "completed today"
// boolean. One small read; absent log row means not completed.
export type CommitmentWithTodayLog = SleepCommitment & {
  completed_today: boolean;
};

export async function getTodayCommitmentsState(
  supabase: SupabaseClient,
  userId: string,
  appDay: string,
): Promise<CommitmentWithTodayLog[]> {
  const active = await listActiveCommitments(supabase, userId);
  if (active.length === 0) return [];

  const { data: logs, error } = await supabase
    .from('sleep_commitment_logs')
    .select('commitment_id, completed')
    .eq('user_id', userId)
    .eq('app_day', appDay)
    .in(
      'commitment_id',
      active.map((c) => c.id),
    );
  if (error) throw error;

  const logMap = new Map<string, boolean>();
  for (const row of (logs ?? []) as Array<{
    commitment_id: string;
    completed: boolean;
  }>) {
    logMap.set(row.commitment_id, row.completed);
  }

  return active.map((c) => ({
    ...c,
    completed_today: logMap.get(c.id) ?? false,
  }));
}

// Window stats — completion rate per commitment over the last N days.
// Used by the weekly review (B) and could surface on /plan/sleep.
export type CommitmentWindowStats = {
  commitment: SleepCommitment;
  days_completed: number;
  days_in_window: number;
};

export async function getCommitmentStatsForWindow(
  supabase: SupabaseClient,
  userId: string,
  windowStartAppDay: string,
  windowEndAppDay: string,
): Promise<CommitmentWindowStats[]> {
  const active = await listActiveCommitments(supabase, userId);
  if (active.length === 0) return [];

  const { data: logs, error } = await supabase
    .from('sleep_commitment_logs')
    .select('commitment_id, app_day, completed')
    .eq('user_id', userId)
    .in(
      'commitment_id',
      active.map((c) => c.id),
    )
    .gte('app_day', windowStartAppDay)
    .lte('app_day', windowEndAppDay);
  if (error) throw error;

  // Days in window = inclusive day count between start and end.
  const start = new Date(windowStartAppDay + 'T00:00:00Z');
  const end = new Date(windowEndAppDay + 'T00:00:00Z');
  const daysInWindow =
    Math.floor((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)) + 1;

  const completedByCommitment = new Map<string, number>();
  for (const row of (logs ?? []) as Array<{
    commitment_id: string;
    app_day: string;
    completed: boolean;
  }>) {
    if (!row.completed) continue;
    completedByCommitment.set(
      row.commitment_id,
      (completedByCommitment.get(row.commitment_id) ?? 0) + 1,
    );
  }

  return active.map((c) => ({
    commitment: c,
    days_completed: completedByCommitment.get(c.id) ?? 0,
    days_in_window: daysInWindow,
  }));
}
