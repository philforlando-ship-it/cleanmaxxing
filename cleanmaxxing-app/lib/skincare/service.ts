// Skincare assessments service. Mirrors lib/style/service.ts shape.

import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  SkincareAssessment,
  SkincareAssessmentInput,
  SkincareReportInputModifiers,
} from './types';

export async function getSkincareAssessment(
  supabase: SupabaseClient,
  userId: string,
): Promise<SkincareAssessment | null> {
  const { data, error } = await supabase
    .from('skincare_assessments')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return rowToAssessment(data);
}

export async function hasSkincareAssessment(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ hasAssessment: boolean; hasReport: boolean }> {
  const { data, error } = await supabase
    .from('skincare_assessments')
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

export async function saveSkincareAssessment(
  supabase: SupabaseClient,
  userId: string,
  input: SkincareAssessmentInput,
): Promise<SkincareAssessment> {
  const row = {
    user_id: userId,
    skin_behavior: input.skin_behavior,
    primary_concern: input.primary_concern,
    current_routine: input.current_routine,
    sun_exposure: input.sun_exposure,
    skincare_goal_text: input.skincare_goal_text,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('skincare_assessments')
    .upsert(row, { onConflict: 'user_id' })
    .select('*')
    .single();
  if (error) throw error;
  return rowToAssessment(data);
}

// Stamps baseline_established_at on the user's skincare assessment.
// Called from the baseline-floor stage card once the user confirms
// cleanser + moisturizer + SPF are in place. Idempotent — re-marking
// is a no-op (preserves the original timestamp).
export async function markBaselineEstablished(
  supabase: SupabaseClient,
  userId: string,
): Promise<void> {
  const existing = await getSkincareAssessment(supabase, userId);
  if (!existing) throw new Error('no_assessment');
  if (existing.baseline_established_at) return;

  const { error } = await supabase
    .from('skincare_assessments')
    .update({
      baseline_established_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);
  if (error) throw error;
}

export async function saveSkincareReport(
  supabase: SupabaseClient,
  userId: string,
  args: {
    report_text: string;
    report_model: string;
    report_input_modifiers: SkincareReportInputModifiers;
  },
): Promise<void> {
  const { error } = await supabase
    .from('skincare_assessments')
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

function rowToAssessment(row: unknown): SkincareAssessment {
  const r = row as Record<string, unknown>;
  return {
    user_id: r.user_id as string,
    skin_behavior: r.skin_behavior as SkincareAssessment['skin_behavior'],
    primary_concern:
      r.primary_concern as SkincareAssessment['primary_concern'],
    current_routine:
      r.current_routine as SkincareAssessment['current_routine'],
    sun_exposure: r.sun_exposure as SkincareAssessment['sun_exposure'],
    skincare_goal_text: (r.skincare_goal_text as string | null) ?? null,
    baseline_established_at:
      (r.baseline_established_at as string | null) ?? null,
    retinoid_started_at:
      (r.retinoid_started_at as string | null) ?? null,
    last_step_up_at: (r.last_step_up_at as string | null) ?? null,
    report_text: (r.report_text as string | null) ?? null,
    report_generated_at: (r.report_generated_at as string | null) ?? null,
    report_model: (r.report_model as string | null) ?? null,
    report_input_modifiers:
      (r.report_input_modifiers as SkincareReportInputModifiers | null) ??
      null,
    created_at: r.created_at as string,
    updated_at: r.updated_at as string,
  };
}
