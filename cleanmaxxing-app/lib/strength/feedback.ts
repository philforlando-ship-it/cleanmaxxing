// Strength autoregulation: morning-after feedback row CRUD + the
// summary the report generator pulls into modifiers.
//
// Schema lives in supabase/migrations/0063_strength_session_feedback.sql.
// The /today recovery-check tile writes to this table; the strength
// report reads the last 7 days of rows on each (re-)generation.

import { z } from 'zod';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { MuscleGroup } from './types';

export type SorenessLevel = 1 | 2 | 3;

export type StrengthSessionFeedback = {
  id: string;
  user_id: string;
  workout_log_id: string | null;
  recorded_on: string; // YYYY-MM-DD (app-day)
  muscle_soreness: Partial<Record<MuscleGroup, SorenessLevel>>;
  joint_pain: boolean | null;
  energy_1_5: number | null;
  pump_1_3: number | null;
  performance_vs_last: 'down' | 'same' | 'up' | null;
  notes: string | null;
  created_at: string;
};

// Aggregate the report generator consumes. Pre-computed so the
// prompt doesn't have to reason over individual rows.
export type StrengthFeedbackSummary = {
  rows_last_7_days: number;
  // Muscles with soreness=3 on two consecutive feedback rows. Drop a
  // set on these next session.
  consecutive_high_soreness: MuscleGroup[];
  // Muscles where the most recent two rows are both <=2 soreness AND
  // the user's overall energy / pump is high. Add a set on these.
  consecutive_low_soreness: MuscleGroup[];
  // Joint pain reports in the window. Surfaces in "What we're not
  // doing" if recurring.
  joint_pain_count: number;
  // Most recent energy reading (1-5). Falls into "fatigue is real"
  // territory at 1-2.
  most_recent_energy: number | null;
  most_recent_recorded_on: string | null;
};

const SoreSchema = z.union([z.literal(1), z.literal(2), z.literal(3)]);

const MuscleSorenessRecord = z.record(
  z.enum([
    'chest',
    'back',
    'shoulders',
    'arms',
    'legs',
    'glutes',
    'core',
    'calves',
  ]),
  SoreSchema,
);

export const RecoveryCheckInputSchema = z.object({
  workout_log_id: z.string().uuid().nullable(),
  recorded_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  muscle_soreness: MuscleSorenessRecord,
  joint_pain: z.boolean().nullable(),
  energy_1_5: z.number().int().min(1).max(5).nullable(),
});

export type RecoveryCheckInput = z.infer<typeof RecoveryCheckInputSchema>;

// Most-recent strength workout in the user's `prior` app-day. Returns
// null when none. Drives the recovery-check card's gating: surface
// only when there's a session worth checking on AND no feedback yet.
export async function getYesterdayStrengthWorkout(
  supabase: SupabaseClient,
  userId: string,
  yesterdayAppDay: string,
): Promise<{
  id: string;
  performed_on: string;
  duration_min: number | null;
  notes: string | null;
  lifts: unknown;
} | null> {
  const { data, error } = await supabase
    .from('workout_logs')
    .select('id, performed_on, duration_min, notes, lifts')
    .eq('user_id', userId)
    .eq('type', 'strength')
    .eq('performed_on', yesterdayAppDay)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  return data as {
    id: string;
    performed_on: string;
    duration_min: number | null;
    notes: string | null;
    lifts: unknown;
  };
}

export async function hasFeedbackForWorkout(
  supabase: SupabaseClient,
  workoutLogId: string,
  recordedOn: string,
): Promise<boolean> {
  const { count } = await supabase
    .from('strength_session_feedback')
    .select('id', { count: 'exact', head: true })
    .eq('workout_log_id', workoutLogId)
    .eq('recorded_on', recordedOn);
  return (count ?? 0) > 0;
}

export async function saveRecoveryCheck(
  supabase: SupabaseClient,
  userId: string,
  input: RecoveryCheckInput,
): Promise<void> {
  const row = {
    user_id: userId,
    workout_log_id: input.workout_log_id,
    recorded_on: input.recorded_on,
    muscle_soreness: input.muscle_soreness,
    joint_pain: input.joint_pain,
    energy_1_5: input.energy_1_5,
  };
  const { error } = await supabase
    .from('strength_session_feedback')
    .insert(row);
  if (error) throw error;
}

// Pulls the last 7 days of feedback rows and computes the aggregate
// the report consumes. Two-consecutive logic uses the recorded_on
// ordering — same muscle showing soreness=3 (or <=2) on the two
// most-recent rows where it appears.
export async function getStrengthFeedbackSummary(
  supabase: SupabaseClient,
  userId: string,
  windowDays = 7,
): Promise<StrengthFeedbackSummary> {
  const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  const { data, error } = await supabase
    .from('strength_session_feedback')
    .select('*')
    .eq('user_id', userId)
    .gte('recorded_on', since)
    .order('recorded_on', { ascending: false });
  if (error || !data) {
    return {
      rows_last_7_days: 0,
      consecutive_high_soreness: [],
      consecutive_low_soreness: [],
      joint_pain_count: 0,
      most_recent_energy: null,
      most_recent_recorded_on: null,
    };
  }
  const rows = data as StrengthSessionFeedback[];

  // For each muscle, find the two most-recent rows that mention it.
  // If both are soreness=3 → consecutive_high. If both are <=2 AND
  // both energy+pump are reasonable → consecutive_low.
  const muscleGroups: MuscleGroup[] = [
    'chest',
    'back',
    'shoulders',
    'arms',
    'legs',
    'glutes',
    'core',
    'calves',
  ];
  const consecutiveHigh: MuscleGroup[] = [];
  const consecutiveLow: MuscleGroup[] = [];
  for (const m of muscleGroups) {
    const mentions = rows
      .map((r) => r.muscle_soreness?.[m])
      .filter((v): v is SorenessLevel => v === 1 || v === 2 || v === 3);
    if (mentions.length < 2) continue;
    const [latest, prior] = mentions;
    if (latest === 3 && prior === 3) consecutiveHigh.push(m);
    else if (latest <= 2 && prior <= 2) consecutiveLow.push(m);
  }

  return {
    rows_last_7_days: rows.length,
    consecutive_high_soreness: consecutiveHigh,
    consecutive_low_soreness: consecutiveLow,
    joint_pain_count: rows.filter((r) => r.joint_pain === true).length,
    most_recent_energy: rows[0]?.energy_1_5 ?? null,
    most_recent_recorded_on: rows[0]?.recorded_on ?? null,
  };
}
