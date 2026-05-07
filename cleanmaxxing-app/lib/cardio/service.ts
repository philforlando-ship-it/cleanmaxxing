// Cardio assessment service. Mirrors the strength service shape.
// Lightweight live-data helper (cardio session count over last N days)
// is the analog to strength's recent-session counter.

import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  CardioAssessment,
  CardioAssessmentInput,
  CardioReportInputModifiers,
} from './types';

export async function getCardioAssessment(
  supabase: SupabaseClient,
  userId: string,
): Promise<CardioAssessment | null> {
  const { data, error } = await supabase
    .from('cardio_assessments')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return rowToAssessment(data);
}

export async function hasCardioAssessment(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ hasAssessment: boolean; hasReport: boolean }> {
  const { data, error } = await supabase
    .from('cardio_assessments')
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

export async function saveCardioAssessment(
  supabase: SupabaseClient,
  userId: string,
  input: CardioAssessmentInput,
): Promise<CardioAssessment> {
  const row = {
    user_id: userId,
    primary_role: input.primary_role,
    current_movement: input.current_movement,
    modality_preference: input.modality_preference,
    days_per_week: input.days_per_week,
    cardio_goal_text: input.cardio_goal_text,
    injury_constraints: input.injury_constraints,
    equipment_access: input.equipment_access,
    outdoor_access: input.outdoor_access,
    time_per_session: input.time_per_session,
    occupation_activity: input.occupation_activity,
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await supabase
    .from('cardio_assessments')
    .upsert(row, { onConflict: 'user_id' })
    .select('*')
    .single();
  if (error) throw error;
  return rowToAssessment(data);
}

export async function saveCardioReport(
  supabase: SupabaseClient,
  userId: string,
  args: {
    report_text: string;
    report_model: string;
    report_input_modifiers: CardioReportInputModifiers;
  },
): Promise<void> {
  const { error } = await supabase
    .from('cardio_assessments')
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

// Live data signal: count of cardio-typed sessions in the last N days.
// Mirrors strength's getRecentStrengthSessionCount.
export async function getRecentCardioSessionCount(
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
    .eq('type', 'cardio')
    .gte('performed_on', since);
  if (error) return 0;
  return count ?? 0;
}

function rowToAssessment(row: unknown): CardioAssessment {
  const r = row as Record<string, unknown>;
  return {
    user_id: r.user_id as string,
    primary_role: r.primary_role as CardioAssessment['primary_role'],
    current_movement:
      r.current_movement as CardioAssessment['current_movement'],
    modality_preference:
      r.modality_preference as CardioAssessment['modality_preference'],
    days_per_week: r.days_per_week as CardioAssessment['days_per_week'],
    cardio_goal_text: (r.cardio_goal_text as string | null) ?? null,
    injury_constraints:
      (r.injury_constraints as CardioAssessment['injury_constraints'] | null) ??
      [],
    equipment_access:
      (r.equipment_access as CardioAssessment['equipment_access']) ?? null,
    outdoor_access:
      (r.outdoor_access as CardioAssessment['outdoor_access']) ?? null,
    time_per_session:
      (r.time_per_session as CardioAssessment['time_per_session']) ?? null,
    occupation_activity:
      (r.occupation_activity as CardioAssessment['occupation_activity']) ??
      null,
    zone_2_layer_started_at:
      (r.zone_2_layer_started_at as string | null) ?? null,
    hiit_layer_started_at:
      (r.hiit_layer_started_at as string | null) ?? null,
    report_text: (r.report_text as string | null) ?? null,
    report_generated_at: (r.report_generated_at as string | null) ?? null,
    report_model: (r.report_model as string | null) ?? null,
    report_input_modifiers:
      (r.report_input_modifiers as CardioReportInputModifiers | null) ??
      null,
    created_at: r.created_at as string,
    updated_at: r.updated_at as string,
  };
}
