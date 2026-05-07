// Shared types + Zod schema for skincare v0. Mirrors check constraints
// in supabase/migrations/0053_skincare_assessments.sql.

import { z } from 'zod';

export type SkinBehavior =
  | 'oily'
  | 'dry'
  | 'combo'
  | 'sensitive'
  | 'normal'
  | 'not_sure';

export type SkincareConcern =
  | 'acne'
  | 'aging'
  | 'uneven_tone'
  | 'dullness'
  | 'sensitivity_redness'
  | 'dryness'
  | 'nothing_specific';

export type SkincareCurrentRoutine =
  | 'none'
  | 'cleanser_only'
  | 'cleanser_moisturizer'
  | 'full_routine'
  | 'overcomplicated';

export type SkincareSunExposure =
  | 'minimal_indoor'
  | 'moderate'
  | 'heavy_outdoor';

export type SkincareSensitivityHistory = 'yes' | 'no' | 'unsure';

export type SkincareBarrierState = 'compromised' | 'normal' | 'unsure';

export type SkincareAssessment = {
  user_id: string;
  skin_behavior: SkinBehavior;
  primary_concern: SkincareConcern;
  current_routine: SkincareCurrentRoutine;
  sun_exposure: SkincareSunExposure;
  // Migration 0073 — depth signals. Both nullable for users whose
  // assessment pre-dates the migration. New assessments collect
  // both; the form treats them as required.
  sensitivity_history: SkincareSensitivityHistory | null;
  barrier_state: SkincareBarrierState | null;
  skincare_goal_text: string | null;
  // Stage milestone (migration 0071) — baseline floor established.
  // Confirms cleanser + moisturizer + SPF are in place before any
  // active is introduced. Users whose current_routine at assessment
  // is already 'cleanser_moisturizer' or 'full_routine' are treated
  // as baseline-established at report time without needing this
  // gate — the floor card surfaces only for 'none' / 'cleanser_only'
  // users.
  baseline_established_at: string | null;
  // Stage milestone (migration 0060) — introduce retinoid. The
  // single highest-leverage skincare decision once the AM/PM
  // baseline (cleanser/moisturizer/SPF) is established.
  retinoid_started_at: string | null;
  // Stage milestone (migration 0061) — 12-week step-up evaluation.
  // Surfaces 12+ weeks after retinoid_started_at (or last_step_up_at
  // if more recent). POV 32 names the months-not-weeks timeline +
  // step-up cadence (higher concentration → vitamin C → professional).
  last_step_up_at: string | null;
  report_text: string | null;
  report_generated_at: string | null;
  report_model: string | null;
  report_input_modifiers: SkincareReportInputModifiers | null;
  created_at: string;
  updated_at: string;
};

export type SkincareReportInputModifiers = {
  skin_type_fitzpatrick: number | null;
  current_interventions: string[];
  budget_tier: string | null;
  age: number | null;
  // Migration 0073 — depth signals echoed into modifiers so the
  // prompt can branch on them. Null when the assessment pre-dates
  // the migration and the user hasn't re-edited.
  sensitivity_history: SkincareSensitivityHistory | null;
  barrier_state: SkincareBarrierState | null;
  // Stage milestone — baseline floor in place. When null AND
  // current_routine is 'none' or 'cleanser_only', the prompt should
  // anchor on building the floor (cleanser + moisturizer + SPF) and
  // explicitly defer actives.
  baseline_established_at: string | null;
  // Stage milestone — retinoid started. When set, the prompt shifts
  // from "consider adding a retinoid" to "ramp + irritation
  // management" guidance.
  retinoid_started_at: string | null;
  // Stage milestone — 12-week step-up. When set, prompt recommends
  // the next layer (higher concentration / vitamin C / professional).
  last_step_up_at: string | null;
};

export const SKIN_BEHAVIOR_LABEL: Record<SkinBehavior, string> = {
  oily: 'Oily — visible shine by mid-day, larger pores',
  dry: 'Dry — feels tight, flakes, no shine',
  combo: 'Combo — oily T-zone, dry or normal cheeks',
  sensitive: 'Sensitive — reacts easily, redness, stinging',
  normal: 'Normal — no real complaints day to day',
  not_sure: 'Not sure — never paid attention to it',
};

export const CONCERN_LABEL: Record<SkincareConcern, string> = {
  acne: 'Active breakouts',
  aging: 'Lines, sagging, loss of firmness',
  uneven_tone: 'Uneven tone — dark spots, post-inflammatory marks',
  dullness: 'Dullness — flat, no glow',
  sensitivity_redness: 'Persistent redness or sensitivity',
  dryness: 'Persistent dryness or barrier issues',
  nothing_specific: 'Nothing specific — want to optimize',
};

export const CURRENT_ROUTINE_LABEL: Record<SkincareCurrentRoutine, string> = {
  none: 'Nothing — water on face, sometimes soap',
  cleanser_only: 'Cleanser only',
  cleanser_moisturizer: 'Cleanser + moisturizer',
  full_routine: 'Full routine — cleanser, moisturizer, sunscreen, ± actives',
  overcomplicated:
    'Overcomplicated — many products, not sure what does what anymore',
};

export const SUN_EXPOSURE_LABEL: Record<SkincareSunExposure, string> = {
  minimal_indoor: 'Minimal — mostly indoor, brief outdoor exposure',
  moderate: 'Moderate — typical outdoor commute and weekends',
  heavy_outdoor:
    'Heavy — outdoor work or sports, hours of direct sun most days',
};

export const SENSITIVITY_HISTORY_LABEL: Record<
  SkincareSensitivityHistory,
  string
> = {
  yes: 'Yes — I’ve had visible reactions (peeling, burning, persistent redness) to actives in the past',
  no: 'No — I’ve used actives without much trouble, or I haven’t tried any',
  unsure: 'Not sure — I’ve never paid close attention',
};

export const BARRIER_STATE_LABEL: Record<SkincareBarrierState, string> = {
  compromised:
    'Compromised right now — visible peeling, persistent redness, or burning when products go on',
  normal: 'Normal — no visible irritation in the last few weeks',
  unsure: 'Not sure',
};

export const SkincareAssessmentInputSchema = z.object({
  skin_behavior: z.enum([
    'oily',
    'dry',
    'combo',
    'sensitive',
    'normal',
    'not_sure',
  ]),
  primary_concern: z.enum([
    'acne',
    'aging',
    'uneven_tone',
    'dullness',
    'sensitivity_redness',
    'dryness',
    'nothing_specific',
  ]),
  current_routine: z.enum([
    'none',
    'cleanser_only',
    'cleanser_moisturizer',
    'full_routine',
    'overcomplicated',
  ]),
  sun_exposure: z.enum(['minimal_indoor', 'moderate', 'heavy_outdoor']),
  sensitivity_history: z.enum(['yes', 'no', 'unsure']),
  barrier_state: z.enum(['compromised', 'normal', 'unsure']),
  skincare_goal_text: z.string().max(280).nullable(),
});

export type SkincareAssessmentInput = z.infer<
  typeof SkincareAssessmentInputSchema
>;
