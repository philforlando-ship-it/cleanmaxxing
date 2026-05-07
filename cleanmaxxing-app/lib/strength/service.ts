// Strength assessment service. Mirrors the other Pattern A topics.
// Also exposes a small live-data helper that returns the user's
// recent strength session count — the report consumes this as a
// "you've trained X strength sessions in the last 7 days" anchor.

import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  StrengthAssessment,
  StrengthAssessmentInput,
  StrengthExercisePreferencesInput,
  StrengthReportInputModifiers,
} from './types';
import { STRENGTH_EXERCISES } from './types';

export async function getStrengthAssessment(
  supabase: SupabaseClient,
  userId: string,
): Promise<StrengthAssessment | null> {
  const { data, error } = await supabase
    .from('strength_assessments')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return rowToAssessment(data);
}

export async function hasStrengthAssessment(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ hasAssessment: boolean; hasReport: boolean }> {
  const { data, error } = await supabase
    .from('strength_assessments')
    .select('user_id, report_generated_at')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return { hasAssessment: false, hasReport: false };
  return {
    hasAssessment: true,
    hasReport: data.report_generated_at !== null,
  };
}

export async function saveStrengthAssessment(
  supabase: SupabaseClient,
  userId: string,
  input: StrengthAssessmentInput,
): Promise<StrengthAssessment> {
  const row = {
    user_id: userId,
    primary_goal: input.primary_goal,
    days_per_week: input.days_per_week,
    equipment_access: input.equipment_access,
    current_split: input.current_split,
    strength_goal_text: input.strength_goal_text,
    priority_muscles: input.priority_muscles,
    lagging_muscles_text: input.lagging_muscles_text,
    secondary_objective: input.secondary_objective,
    injury_constraints: input.injury_constraints,
    bodyweight_preference: input.bodyweight_preference,
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await supabase
    .from('strength_assessments')
    .upsert(row, { onConflict: 'user_id' })
    .select('*')
    .single();
  if (error) throw error;
  return rowToAssessment(data);
}

export async function saveStrengthReport(
  supabase: SupabaseClient,
  userId: string,
  args: {
    report_text: string;
    report_model: string;
    report_input_modifiers: StrengthReportInputModifiers;
  },
): Promise<void> {
  const { error } = await supabase
    .from('strength_assessments')
    .update({
      report_text: args.report_text,
      report_generated_at: new Date().toISOString(),
      report_model: args.report_model,
      report_input_modifiers: args.report_input_modifiers,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);
  if (error) throw error;
}

// Lightweight read for the report's live data signal — count of
// strength-typed sessions in the last 7 days. Cheaper than pulling
// the full WorkoutState shape since we only need one number.
export async function getRecentStrengthSessionCount(
  supabase: SupabaseClient,
  userId: string,
  windowDays = 7,
): Promise<number> {
  const since = new Date(
    Date.now() - windowDays * 24 * 60 * 60 * 1000,
  )
    .toISOString()
    .slice(0, 10);
  const { count, error } = await supabase
    .from('workout_logs')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('type', 'strength')
    .gte('performed_on', since);
  if (error) return 0;
  return count ?? 0;
}

function rowToAssessment(row: unknown): StrengthAssessment {
  const r = row as Record<string, unknown>;
  return {
    user_id: r.user_id as string,
    primary_goal: r.primary_goal as StrengthAssessment['primary_goal'],
    days_per_week: r.days_per_week as StrengthAssessment['days_per_week'],
    equipment_access:
      r.equipment_access as StrengthAssessment['equipment_access'],
    current_split: r.current_split as StrengthAssessment['current_split'],
    strength_goal_text: (r.strength_goal_text as string | null) ?? null,
    priority_muscles:
      (r.priority_muscles as StrengthAssessment['priority_muscles'] | null) ??
      [],
    lagging_muscles_text: (r.lagging_muscles_text as string | null) ?? null,
    secondary_objective:
      (r.secondary_objective as StrengthAssessment['secondary_objective']) ??
      null,
    injury_constraints:
      (r.injury_constraints as StrengthAssessment['injury_constraints'] | null) ??
      [],
    bodyweight_preference:
      (r.bodyweight_preference as StrengthAssessment['bodyweight_preference']) ??
      null,
    selected_exercise_slugs:
      (r.selected_exercise_slugs as string[] | null) ?? [],
    excluded_exercise_slugs:
      (r.excluded_exercise_slugs as string[] | null) ?? [],
    exercise_filter_text: (r.exercise_filter_text as string | null) ?? null,
    beginner_ramp_completed_at:
      (r.beginner_ramp_completed_at as string | null) ?? null,
    last_plateau_intervention_at:
      (r.last_plateau_intervention_at as string | null) ?? null,
    report_text: (r.report_text as string | null) ?? null,
    report_generated_at: (r.report_generated_at as string | null) ?? null,
    report_model: (r.report_model as string | null) ?? null,
    report_input_modifiers:
      (r.report_input_modifiers as StrengthReportInputModifiers | null) ??
      null,
    created_at: r.created_at as string,
    updated_at: r.updated_at as string,
  };
}

// Save exercise preferences to the assessment row WITHOUT triggering
// a report regeneration. The user updates picks freely; regeneration
// is a separate explicit action via /api/plan/strength/regenerate.
//
// Slugs are filtered against the catalog at this layer so unknown
// slugs (e.g. from a stale client) get dropped rather than persisted.
export async function saveExercisePreferences(
  supabase: SupabaseClient,
  userId: string,
  input: StrengthExercisePreferencesInput,
): Promise<StrengthAssessment> {
  const validSlugs = new Set(STRENGTH_EXERCISES.map((e) => e.slug));
  const selected = input.selected_exercise_slugs.filter((s) =>
    validSlugs.has(s),
  );
  const excluded = input.excluded_exercise_slugs.filter((s) =>
    validSlugs.has(s),
  );

  const { data, error } = await supabase
    .from('strength_assessments')
    .update({
      selected_exercise_slugs: selected,
      excluded_exercise_slugs: excluded,
      exercise_filter_text: input.exercise_filter_text,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .select('*')
    .single();
  if (error) throw error;
  return rowToAssessment(data);
}
