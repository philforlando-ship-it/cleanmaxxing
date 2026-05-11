// Shared types + Zod schema for facial_structure v1. Mirrors check
// constraints in supabase/migrations/0110_facial_structure_journey.sql.
//
// Design grounded in POV 16 (primary) + POV 50 (posture) + POV 13
// (body comp) + POV 28 (cosmetic procedures) + POV 38 (aging) + POV 44
// (facial puff) + POV 18 (tanning) + POV 33 (mewing) + POV 06
// (bone-smashing hard-no). See lib/facial-structure/report-prompt.ts
// for how each variable threads into the report.

import { z } from 'zod';

export type FacialStructureBodyFat =
  | 'under_12'
  | '12_to_15'
  | '15_to_20'
  | '20_to_25'
  | 'over_25';

export type FaceFirstDistribution =
  | 'face_sharper_than_body'
  | 'face_matches_body'
  | 'face_softer_than_body'
  | 'not_sure';

export type PosturalPattern =
  | 'forward_head'
  | 'rounded_shoulders'
  | 'anterior_pelvic_tilt'
  | 'none_apparent'
  | 'unsure';

export const POSTURAL_PATTERN_VALUES: ReadonlyArray<PosturalPattern> = [
  'forward_head',
  'rounded_shoulders',
  'anterior_pelvic_tilt',
  'none_apparent',
  'unsure',
];

export type ChinJawConcern =
  | 'chin_projection_side'
  | 'jaw_definition_front'
  | 'chin_neck_transition'
  | 'submental_fullness'
  | 'overall_softness'
  | 'no_specific_concern';

export type FacialPuffBaseline =
  | 'rarely'
  | 'few_days_per_month'
  | 'most_mornings'
  | 'persistent';

export type CosmeticProcedureOpenness =
  | 'not_open'
  | 'curious_about_options'
  | 'actively_considering'
  | 'already_done';

export type FacialStructureAssessment = {
  user_id: string;
  body_fat_estimate: FacialStructureBodyFat;
  face_first_distribution: FaceFirstDistribution;
  postural_pattern: PosturalPattern[];
  chin_jaw_concern: ChinJawConcern;
  facial_puff_baseline: FacialPuffBaseline;
  cosmetic_procedure_openness: CosmeticProcedureOpenness;
  notes: string | null;
  report_text: string | null;
  report_generated_at: string | null;
  report_model: string | null;
  report_input_tokens: number | null;
  report_output_tokens: number | null;
  report_input_modifiers: FacialStructureReportInputModifiers | null;
  // Pattern A stages — see migration 0110 for rationale on stage_4
  // having both unlock + acknowledged timestamps.
  stage_1_acknowledged_at: string | null;
  stage_2_started_at: string | null;
  stage_2_completed_at: string | null;
  stage_3_acknowledged_at: string | null;
  stage_4_unlocked_at: string | null;
  stage_4_acknowledged_at: string | null;
  // Monthly photo cadence (mig 0111). Stamped by the /today
  // photo-due tile when the user logs that they've taken this
  // month's same-conditions photo. Drives the next-due calc.
  last_facial_photo_logged_at: string | null;
  // Mig 0112 — user override of the computed primary lever. NULL =
  // use the computed value from lib/facial-structure/primary-lever.ts.
  // When set, Stage 2 reads this instead. Useful when the LLM report
  // names a different lever than the deterministic compute (the
  // compute is mechanical; the prompt has nuance).
  primary_lever_override: PrimaryLeverValue | null;
  created_at: string;
  updated_at: string;
};

// String-literal mirror of lib/facial-structure/primary-lever.ts
// PrimaryLever — kept here to avoid a circular import (types →
// primary-lever → types).
export type PrimaryLeverValue =
  | 'body_comp'
  | 'puff_diagnostic'
  | 'posture_neck'
  | 'cosmetic_patternd'
  | 'framing';

// Modifiers snapshotted at report generation time. The report-prompt
// reads these instead of re-querying so a stored report stays
// reproducible against the inputs it was actually written for.
// Includes cross-journey reads — posture state from POV 50's
// surface, sleep state from sleep_logs, hair / facial-hair density
// for framing notes — so the report can coordinate without those
// journeys having to be loaded again at render time.
export type FacialStructureReportInputModifiers = {
  age: number | null;
  // Body comp coordination — read from user_profile at generation
  // time. The assessment captures the user's self-estimate too;
  // when they differ the assessment value wins (more recent).
  bf_pct_self_estimate: string | null;
  budget_tier: string | null;
  current_interventions: string[];
  // Sleep state at generation time (read from sleep journey when
  // present). avgSleepHoursLast28 powers the puff diagnostic
  // routing.
  avg_sleep_hours_last_28: number | null;
  // Hair + facial-hair density signals for the framing layer.
  hair_density_state: string | null;
  hair_balding_pattern: string | null;
  facial_hair_current_state: string | null;
};

// =====================
// Labels (UI surface)
// =====================

export const BODY_FAT_LABEL: Record<FacialStructureBodyFat, string> = {
  under_12: 'Under 12% — visible vascularity, sharp definition',
  '12_to_15': '12–15% — abs visible, jaw sharp',
  '15_to_20': '15–20% — athletic, no abs visible at rest',
  '20_to_25': '20–25% — softer outline, no clear jaw line',
  over_25: 'Over 25% — substantial soft tissue obscuring structure',
};

export const FACE_FIRST_DISTRIBUTION_LABEL: Record<
  FaceFirstDistribution,
  string
> = {
  face_sharper_than_body:
    'Face reads sharper than my body — friends say my face is lean even when I am not',
  face_matches_body:
    'Face and body track together — when I lean out, my face leans out',
  face_softer_than_body:
    'Face holds softness longer than my body — body looks lean, face still looks full',
  not_sure: 'Not sure — never thought about it this way',
};

export const POSTURAL_PATTERN_LABEL: Record<PosturalPattern, string> = {
  forward_head: 'Forward head — ears in front of shoulders in side photos',
  rounded_shoulders:
    'Rounded shoulders — shoulders curl forward, chest looks sunken',
  anterior_pelvic_tilt:
    'Anterior pelvic tilt — lower back arches, belly pushes forward',
  none_apparent: 'None obvious — my posture reads pretty straight',
  unsure: 'Not sure — never had anyone look',
};

export const CHIN_JAW_CONCERN_LABEL: Record<ChinJawConcern, string> = {
  chin_projection_side:
    'Chin projection in side profile — chin sits back from where I want',
  jaw_definition_front:
    'Jaw definition front-on — angle from ear to chin reads soft',
  chin_neck_transition:
    'Chin-to-neck transition — line is unclear, neck blends in',
  submental_fullness:
    'Submental fullness — under-chin area holds visible softness',
  overall_softness: 'Overall facial softness — the whole face reads soft',
  no_specific_concern:
    'No specific concern — just want to optimize what I have',
};

export const FACIAL_PUFF_BASELINE_LABEL: Record<
  FacialPuffBaseline,
  string
> = {
  rarely: 'Rarely — face reads the same most mornings',
  few_days_per_month:
    'A few days a month — usually traceable to a late night or a heavy meal',
  most_mornings: 'Most mornings — face takes hours to "settle"',
  persistent: 'Persistent — face stays puffy through the day',
};

export const COSMETIC_PROCEDURE_OPENNESS_LABEL: Record<
  CosmeticProcedureOpenness,
  string
> = {
  not_open:
    'Not open — interested only in what I can do behaviorally',
  curious_about_options:
    'Curious about options — want to understand what is available',
  actively_considering:
    'Actively considering — researching specific procedures',
  already_done: 'Already done — have had procedures and want maintenance guidance',
};

// =====================
// Zod schema (form / API validation)
// =====================

export const FacialStructureAssessmentInputSchema = z.object({
  body_fat_estimate: z.enum([
    'under_12',
    '12_to_15',
    '15_to_20',
    '20_to_25',
    'over_25',
  ]),
  face_first_distribution: z.enum([
    'face_sharper_than_body',
    'face_matches_body',
    'face_softer_than_body',
    'not_sure',
  ]),
  postural_pattern: z.array(
    z.enum([
      'forward_head',
      'rounded_shoulders',
      'anterior_pelvic_tilt',
      'none_apparent',
      'unsure',
    ]),
  ),
  chin_jaw_concern: z.enum([
    'chin_projection_side',
    'jaw_definition_front',
    'chin_neck_transition',
    'submental_fullness',
    'overall_softness',
    'no_specific_concern',
  ]),
  facial_puff_baseline: z.enum([
    'rarely',
    'few_days_per_month',
    'most_mornings',
    'persistent',
  ]),
  cosmetic_procedure_openness: z.enum([
    'not_open',
    'curious_about_options',
    'actively_considering',
    'already_done',
  ]),
  notes: z.string().max(280).nullable(),
});

export type FacialStructureAssessmentInput = z.infer<
  typeof FacialStructureAssessmentInputSchema
>;
