// Facial hair assessments service. Mirrors lib/style/service.ts shape.

import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  FacialHairAssessment,
  FacialHairAssessmentInput,
  FacialHairReportInputModifiers,
} from './types';

export async function getFacialHairAssessment(
  supabase: SupabaseClient,
  userId: string,
): Promise<FacialHairAssessment | null> {
  const { data, error } = await supabase
    .from('facial_hair_assessments')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return rowToAssessment(data);
}

export async function hasFacialHairAssessment(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ hasAssessment: boolean; hasReport: boolean }> {
  const { data, error } = await supabase
    .from('facial_hair_assessments')
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

export async function saveFacialHairAssessment(
  supabase: SupabaseClient,
  userId: string,
  input: FacialHairAssessmentInput,
): Promise<FacialHairAssessment> {
  // growth_quality intentionally omitted from the upsert row — new
  // assessments collect density_cheeks / density_chin /
  // density_mustache instead. Legacy rows that already have a
  // growth_quality value keep it (Supabase upsert with explicit
  // columns leaves unlisted columns alone on update).
  const row = {
    user_id: userId,
    current_state: input.current_state,
    density_cheeks: input.density_cheeks,
    density_chin: input.density_chin,
    density_mustache: input.density_mustache,
    goal: input.goal,
    time_commitment: input.time_commitment,
    facial_hair_goal_text: input.facial_hair_goal_text,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('facial_hair_assessments')
    .upsert(row, { onConflict: 'user_id' })
    .select('*')
    .single();
  if (error) throw error;
  return rowToAssessment(data);
}

export async function saveFacialHairReport(
  supabase: SupabaseClient,
  userId: string,
  args: {
    report_text: string;
    report_model: string;
    report_input_modifiers: FacialHairReportInputModifiers;
  },
): Promise<void> {
  const { error } = await supabase
    .from('facial_hair_assessments')
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

function rowToAssessment(row: unknown): FacialHairAssessment {
  const r = row as Record<string, unknown>;
  return {
    user_id: r.user_id as string,
    current_state: r.current_state as FacialHairAssessment['current_state'],
    growth_quality:
      (r.growth_quality as FacialHairAssessment['growth_quality']) ?? null,
    density_cheeks:
      (r.density_cheeks as FacialHairAssessment['density_cheeks']) ?? null,
    density_chin:
      (r.density_chin as FacialHairAssessment['density_chin']) ?? null,
    density_mustache:
      (r.density_mustache as FacialHairAssessment['density_mustache']) ?? null,
    goal: r.goal as FacialHairAssessment['goal'],
    time_commitment:
      r.time_commitment as FacialHairAssessment['time_commitment'],
    facial_hair_goal_text:
      (r.facial_hair_goal_text as string | null) ?? null,
    growout_test_started_at:
      (r.growout_test_started_at as string | null) ?? null,
    growout_test_completed_at:
      (r.growout_test_completed_at as string | null) ?? null,
    report_text: (r.report_text as string | null) ?? null,
    report_generated_at: (r.report_generated_at as string | null) ?? null,
    report_model: (r.report_model as string | null) ?? null,
    report_input_modifiers:
      (r.report_input_modifiers as FacialHairReportInputModifiers | null) ??
      null,
    created_at: r.created_at as string,
    updated_at: r.updated_at as string,
  };
}
