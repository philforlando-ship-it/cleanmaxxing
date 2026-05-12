// Facial structure assessments service. Mirrors lib/skincare/service.ts
// shape — same upsert / select pattern, same row-to-typed-object
// conversion at the boundary.
//
// Multi-select postural_pattern is validated at the service layer
// (Postgres array element checks are awkward). See POSTURAL_PATTERN_VALUES
// in types.ts for the allowed set.

import type { SupabaseClient } from '@supabase/supabase-js';
import {
  CHIN_JAW_CONCERN_VALUES,
  POSTURAL_PATTERN_VALUES,
  type ChinJawConcern,
  type FacialStructureAssessment,
  type FacialStructureAssessmentInput,
  type FacialStructureReportInputModifiers,
  type PosturalPattern,
} from './types';
import type { PhotoFeatures } from './photo-baseline/types';

export async function getFacialStructureAssessment(
  supabase: SupabaseClient,
  userId: string,
): Promise<FacialStructureAssessment | null> {
  const { data, error } = await supabase
    .from('facial_structure_assessments')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return rowToAssessment(data);
}

export async function hasFacialStructureAssessment(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ hasAssessment: boolean; hasReport: boolean }> {
  const { data, error } = await supabase
    .from('facial_structure_assessments')
    .select('user_id, report_generated_at')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return { hasAssessment: false, hasReport: false };
  return {
    hasAssessment: true,
    hasReport: (data as { report_generated_at: string | null })
      .report_generated_at !== null,
  };
}

export async function saveFacialStructureAssessment(
  supabase: SupabaseClient,
  userId: string,
  input: FacialStructureAssessmentInput,
): Promise<FacialStructureAssessment> {
  // Sanitize postural_pattern against the allowed set. Zod validates
  // shape; this is the runtime guard against a hand-rolled API caller
  // sending a value the DB check would reject.
  const cleanedPostural = input.postural_pattern.filter(
    (p): p is PosturalPattern =>
      (POSTURAL_PATTERN_VALUES as ReadonlyArray<string>).includes(p),
  );
  // Same sanitization for chin_jaw_concern (multi-select since mig
  // 0113). Empty arrays would fail the DB check; Zod enforces non-empty
  // upstream, so by the time we get here the input is valid — this
  // just narrows the type.
  const cleanedConcerns = input.chin_jaw_concern.filter(
    (c): c is ChinJawConcern =>
      (CHIN_JAW_CONCERN_VALUES as ReadonlyArray<string>).includes(c),
  );

  const row = {
    user_id: userId,
    body_fat_estimate: input.body_fat_estimate,
    face_first_distribution: input.face_first_distribution,
    postural_pattern: cleanedPostural,
    chin_jaw_concern: cleanedConcerns,
    facial_puff_baseline: input.facial_puff_baseline,
    cosmetic_procedure_openness: input.cosmetic_procedure_openness,
    notes: input.notes,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('facial_structure_assessments')
    .upsert(row, { onConflict: 'user_id' })
    .select('*')
    .single();
  if (error) throw error;
  return rowToAssessment(data);
}

export async function saveFacialStructureReport(
  supabase: SupabaseClient,
  userId: string,
  reportText: string,
  reportModel: string,
  modifiers: FacialStructureReportInputModifiers,
  tokens: { input: number; output: number } | null,
): Promise<void> {
  const { error } = await supabase
    .from('facial_structure_assessments')
    .update({
      report_text: reportText,
      report_generated_at: new Date().toISOString(),
      report_model: reportModel,
      report_input_tokens: tokens?.input ?? null,
      report_output_tokens: tokens?.output ?? null,
      report_input_modifiers: modifiers,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);
  if (error) throw error;
}

function rowToAssessment(row: unknown): FacialStructureAssessment {
  const r = row as Record<string, unknown>;
  return {
    user_id: r.user_id as string,
    body_fat_estimate:
      r.body_fat_estimate as FacialStructureAssessment['body_fat_estimate'],
    face_first_distribution:
      r.face_first_distribution as FacialStructureAssessment['face_first_distribution'],
    postural_pattern: (r.postural_pattern as PosturalPattern[]) ?? [],
    chin_jaw_concern:
      r.chin_jaw_concern as FacialStructureAssessment['chin_jaw_concern'],
    facial_puff_baseline:
      r.facial_puff_baseline as FacialStructureAssessment['facial_puff_baseline'],
    cosmetic_procedure_openness:
      r.cosmetic_procedure_openness as FacialStructureAssessment['cosmetic_procedure_openness'],
    notes: (r.notes as string | null) ?? null,
    report_text: (r.report_text as string | null) ?? null,
    report_generated_at: (r.report_generated_at as string | null) ?? null,
    report_model: (r.report_model as string | null) ?? null,
    report_input_tokens: (r.report_input_tokens as number | null) ?? null,
    report_output_tokens: (r.report_output_tokens as number | null) ?? null,
    report_input_modifiers:
      (r.report_input_modifiers as FacialStructureReportInputModifiers | null) ??
      null,
    stage_1_acknowledged_at:
      (r.stage_1_acknowledged_at as string | null) ?? null,
    stage_2_started_at: (r.stage_2_started_at as string | null) ?? null,
    stage_2_completed_at: (r.stage_2_completed_at as string | null) ?? null,
    stage_3_acknowledged_at:
      (r.stage_3_acknowledged_at as string | null) ?? null,
    stage_4_unlocked_at: (r.stage_4_unlocked_at as string | null) ?? null,
    stage_4_acknowledged_at:
      (r.stage_4_acknowledged_at as string | null) ?? null,
    last_facial_photo_logged_at:
      (r.last_facial_photo_logged_at as string | null) ?? null,
    primary_lever_override:
      (r.primary_lever_override as FacialStructureAssessment['primary_lever_override']) ??
      null,
    photo_features: (r.photo_features as PhotoFeatures | null) ?? null,
    photo_features_at: (r.photo_features_at as string | null) ?? null,
    photo_features_model: (r.photo_features_model as string | null) ?? null,
    photo_features_refused: (r.photo_features_refused as boolean | null) ?? null,
    photo_features_refusal_reason:
      (r.photo_features_refusal_reason as string | null) ?? null,
    created_at: r.created_at as string,
    updated_at: r.updated_at as string,
  };
}

// Persist a photo-baseline analysis run. Called from the
// /api/plan/facial-structure/photo-baseline route after the model
// returns. The assessment row must already exist — the
// facial-structure form requires it before the photo step.
export async function saveFacialStructurePhotoBaseline(
  supabase: SupabaseClient,
  userId: string,
  features: PhotoFeatures | null,
  refused: boolean,
  refusalReason: string | null,
  model: string,
): Promise<void> {
  const { error } = await supabase
    .from('facial_structure_assessments')
    .update({
      photo_features: features,
      photo_features_at: new Date().toISOString(),
      photo_features_model: model,
      photo_features_refused: refused,
      photo_features_refusal_reason: refusalReason,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);
  if (error) throw error;
}
