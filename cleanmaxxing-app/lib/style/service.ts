// Style assessments service. Mirrors lib/hair/service.ts shape so the
// Pattern A framework's CRUD pattern stays recognizable across topics.

import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  StyleAssessment,
  StyleAssessmentInput,
  StyleReportInputModifiers,
} from './types';

export async function getStyleAssessment(
  supabase: SupabaseClient,
  userId: string,
): Promise<StyleAssessment | null> {
  const { data, error } = await supabase
    .from('style_assessments')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return rowToAssessment(data);
}

export async function hasStyleAssessment(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ hasAssessment: boolean; hasReport: boolean }> {
  const { data, error } = await supabase
    .from('style_assessments')
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

export async function saveStyleAssessment(
  supabase: SupabaseClient,
  userId: string,
  input: StyleAssessmentInput,
): Promise<StyleAssessment> {
  const row = {
    user_id: userId,
    frame_estimate: input.frame_estimate,
    current_archetype: input.current_archetype,
    target_archetype: input.target_archetype,
    closet_state: input.closet_state,
    style_goal_text: input.style_goal_text,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('style_assessments')
    .upsert(row, { onConflict: 'user_id' })
    .select('*')
    .single();
  if (error) throw error;
  return rowToAssessment(data);
}

export async function saveStyleReport(
  supabase: SupabaseClient,
  userId: string,
  args: {
    report_text: string;
    report_model: string;
    report_input_modifiers: StyleReportInputModifiers;
  },
): Promise<void> {
  const { error } = await supabase
    .from('style_assessments')
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

function rowToAssessment(row: unknown): StyleAssessment {
  const r = row as Record<string, unknown>;
  return {
    user_id: r.user_id as string,
    frame_estimate: r.frame_estimate as StyleAssessment['frame_estimate'],
    current_archetype:
      r.current_archetype as StyleAssessment['current_archetype'],
    target_archetype:
      r.target_archetype as StyleAssessment['target_archetype'],
    closet_state: r.closet_state as StyleAssessment['closet_state'],
    style_goal_text: (r.style_goal_text as string | null) ?? null,
    report_text: (r.report_text as string | null) ?? null,
    report_generated_at:
      (r.report_generated_at as string | null) ?? null,
    report_model: (r.report_model as string | null) ?? null,
    report_input_modifiers:
      (r.report_input_modifiers as StyleReportInputModifiers | null) ?? null,
    created_at: r.created_at as string,
    updated_at: r.updated_at as string,
  };
}
