// Server-side helpers for the workout tracker. Reads recent
// workout_logs rows for /today's card hydration and Mister P's
// user-state calibration. Like the sleep service, the recent
// counts are computed over the last N logged sessions/days
// without requiring a server-side timezone — the date math is
// done relative to whatever performed_on the client wrote.

import type { SupabaseClient } from '@supabase/supabase-js';

export type WorkoutType = 'strength' | 'cardio' | 'mobility' | 'other';

export type Lift = {
  name: string;
  sets?: number | null;
  reps?: number | null;
  weight_lbs?: number | null;
};

export type WorkoutLog = {
  id: string;
  performed_on: string; // YYYY-MM-DD
  type: WorkoutType;
  duration_min: number | null;
  notes: string | null;
  lifts: Lift[];
};

export type WorkoutState = {
  // Last 14 sessions, oldest first (for chart-friendly order).
  recent: WorkoutLog[];
  // Sessions in the last 7 days by `performed_on` calendar date.
  countLast7: number;
  // Type breakdown for the last 7 days. Keys are workout types,
  // values are session counts.
  countLast7ByType: Partial<Record<WorkoutType, number>>;
  // Most recent workout's performed_on, null when no logs.
  mostRecentDate: string | null;
};

const RECENT_LIMIT = 14;
const ROLLING_WINDOW_DAYS = 7;

export async function getWorkoutState(
  supabase: SupabaseClient,
  userId: string,
  now: Date = new Date(),
): Promise<WorkoutState> {
  const { data, error } = await supabase
    .from('workout_logs')
    .select('id, performed_on, type, duration_min, notes, lifts')
    .eq('user_id', userId)
    .order('performed_on', { ascending: false })
    .limit(RECENT_LIMIT);

  if (error) {
    return {
      recent: [],
      countLast7: 0,
      countLast7ByType: {},
      mostRecentDate: null,
    };
  }

  const rows = (data ?? []).map((r) => {
    const row = r as {
      id: string;
      performed_on: string;
      type: WorkoutType;
      duration_min: number | null;
      notes: string | null;
      lifts: unknown;
    };
    return {
      id: row.id,
      performed_on: row.performed_on,
      type: row.type,
      duration_min: row.duration_min,
      notes: row.notes,
      lifts: Array.isArray(row.lifts) ? (row.lifts as Lift[]) : [],
    };
  });

  // Last-7-days window — date math against the server clock.
  // Good enough for v1; full timezone handling is the
  // optimization story (same as sleep tracker today).
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - (ROLLING_WINDOW_DAYS - 1));
  const cutoffStr = `${cutoff.getFullYear()}-${String(cutoff.getMonth() + 1).padStart(2, '0')}-${String(cutoff.getDate()).padStart(2, '0')}`;

  const recentInWindow = rows.filter((r) => r.performed_on >= cutoffStr);
  const countLast7 = recentInWindow.length;
  const countLast7ByType: Partial<Record<WorkoutType, number>> = {};
  for (const r of recentInWindow) {
    countLast7ByType[r.type] = (countLast7ByType[r.type] ?? 0) + 1;
  }

  return {
    recent: rows.reverse(), // oldest first
    countLast7,
    countLast7ByType,
    mostRecentDate: rows.length > 0 ? rows[rows.length - 1].performed_on : null,
  };
}
