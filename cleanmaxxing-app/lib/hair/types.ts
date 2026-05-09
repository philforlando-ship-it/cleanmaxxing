// Shared types + Zod schemas for the hair plan v0. Mirrors the check
// constraints in supabase/migrations/0035_hair_assessments.sql — keep
// these two in sync. Treat the migration as source of truth: if a
// constraint changes there, update the union here too.

import { z } from 'zod';

export type FaceShape =
  | 'oval'
  | 'round'
  | 'square'
  | 'long_rectangular'
  | 'heart_triangle';

export type DensityState =
  | 'full'
  | 'mature_hairline'
  | 'receding_hairline'
  | 'crown_thinning'
  | 'diffuse_thinning'
  | 'advanced_thinning'
  | 'shaved_or_buzzed';

export type HairTypeStrand = 'fine' | 'medium' | 'thick_coarse';
export type HairTypePattern = 'straight' | 'wavy' | 'curly' | 'coily';
export type HairTypeDensity = 'low' | 'medium' | 'high';

export type WhoCuts = 'self' | 'chain' | 'dedicated_barber';

// Stage 1 — cut family. Twelve named cuts a barber will recognize, plus
// 'bald_track' / 'clean_shave' for users whose density_state is
// 'shaved_or_buzzed' or who are transitioning toward bald. Mirrors the
// check constraint history in 0036 → 0045 → 0065.
//
// 'caesar' and 'high_taper_crop' are balding-friendly cuts added in
// migration 0065. The density-filtered menu in
// lib/hair/cut-by-density.ts gates which cuts each user sees, so users
// with thinning density see these prominently and users with full
// density see the broader range.
//
// Migration 0077 added the 2026 modern set:
//   slick_back_undercut — Darmody/Shelby. Distinct from slick_back
//     (which has even sides, no contrast).
//   textured_fringe — Peaky Blinders fringe over the brow with a low
//     fade. Distinct from curtains (middle-part flow).
//   overgrown_buzz — modern buzz with more length on top.
//   broccoli, wolf_cut, modern_mullet — youth-coded, gated by the
//     age filter in lib/hair/cut-by-age.ts.
//   side_part_combover — soft option for early recession at 35+.
export type CutFamily =
  | 'caesar'
  | 'high_taper_crop'
  | 'textured_crop'
  | 'ivy_league'
  | 'textured_quiff'
  | 'mid_length_textured'
  | 'crew_cut'
  | 'buzz_cut'
  | 'slick_back'
  | 'slick_back_undercut'
  | 'curtains'
  | 'textured_fringe'
  | 'overgrown_buzz'
  | 'broccoli'
  | 'wolf_cut'
  | 'modern_mullet'
  | 'side_part_combover'
  | 'pompadour'
  | 'bald_fade'
  | 'short_fade'
  | 'bald_track'
  | 'clean_shave'
  // Migration 0091 (2026-05-08) — two families added per catalog
  // audit. bro_flow = medium-length clean flow (cross-age, density-
  // required). classic_sweep_back = short-medium executive sweep
  // (mature-friendly).
  | 'bro_flow'
  | 'classic_sweep_back';

export const CUT_FAMILIES: ReadonlyArray<CutFamily> = [
  'caesar',
  'high_taper_crop',
  'textured_crop',
  'ivy_league',
  'textured_quiff',
  'mid_length_textured',
  'crew_cut',
  'buzz_cut',
  'slick_back',
  'slick_back_undercut',
  'curtains',
  'textured_fringe',
  'overgrown_buzz',
  'broccoli',
  'wolf_cut',
  'modern_mullet',
  'side_part_combover',
  'pompadour',
  'bald_fade',
  'short_fade',
  'bald_track',
  'clean_shave',
  'bro_flow',
  'classic_sweep_back',
] as const;

// Stage 2 — density action. Three paths, the user owns the call.
// Mister P presents the decision-support content but does not pick.
export type Stage2Path = 'treat' | 'monitor' | 'transition';

export const STAGE_2_PATH_LABEL: Record<Stage2Path, string> = {
  treat: 'Treat — start a structured treatment-consideration plan',
  monitor: 'Monitor — baseline photos + recheck cadence',
  transition: 'Transition — move toward a buzz / shave with intent',
};

export const CUT_FAMILY_LABEL: Record<CutFamily, string> = {
  caesar: 'Caesar / Short Forward Crop',
  high_taper_crop: 'High Taper Crop / Modern Skin Fade',
  textured_crop: 'Textured Crop / French Crop',
  ivy_league: 'Ivy League / Classic Taper',
  textured_quiff: 'Textured Quiff',
  mid_length_textured: 'Mid-Length Textured',
  crew_cut: 'Crew Cut / Short Taper',
  buzz_cut: 'Buzz Cut',
  slick_back: 'Slick Back / Flow Back',
  slick_back_undercut: 'Slicked-Back Undercut (Darmody / Shelby)',
  curtains: 'Curtains / Middle Part Flow',
  textured_fringe: 'Textured Fringe (Shelby Fringe)',
  overgrown_buzz: 'Overgrown Buzz',
  broccoli: 'Broccoli (Curly Taper)',
  wolf_cut: 'Wolf Cut (Shaggy Flow)',
  modern_mullet: 'Modern Mullet (Low-Taper)',
  side_part_combover: 'Side Part with Comb-Over',
  pompadour: 'Pompadour',
  bald_fade: 'Bald Fade (deliberate shaved + fade)',
  short_fade: 'Short Fade (balding-friendly very-short top)',
  bald_track: 'Bald track (transitioning / buzz maintenance)',
  clean_shave: 'Clean Shave (Bic’d, razor-smooth)',
  bro_flow: 'Bro Flow / Medium-Length Flow',
  classic_sweep_back: 'Classic Sweep Back / Executive Flow',
};

// Migration 0091 (2026-05-08) — cultural-reference variant names per
// family. Each family has 0+ named variants the user can recognize
// (celebrity references, era references, descriptive sub-styles).
// Surfaced in the menu inline below the family label so users see
// "Pompadour — Classic / Modern / Hard Part / Salt-and-Pepper" and
// pick the family that includes their reference.
//
// These are NOT separate selectable rows — they're tags on the
// family entry. The IMAGE catalog (public/images/cut-families/)
// already supports cohort + density variants; references add a
// cultural-language layer on top.
//
// Empty array = no notable named variants for that family. Don't
// pad — silence is correct when nothing distinct comes to mind.
export const CUT_FAMILY_REFERENCES: Record<CutFamily, ReadonlyArray<string>> = {
  caesar: ['Classic', 'Short Curly Caesar', 'Modern Caesar'],
  high_taper_crop: ['High Taper', 'Modern Skin Fade'],
  textured_crop: ['Textured Crop', 'French Crop', 'Forward Crop'],
  ivy_league: [
    'Classic Ivy League',
    'Textured Ivy League',
    'Modern Textured Ivy',
    'Short Side Sweep',
  ],
  textured_quiff: ['Modern Quiff', 'Loose Quiff', 'Short Quiff'],
  mid_length_textured: [
    'Joe Goldberg Flow',
    'Textured Flow',
    'Modern Loose Side Sweep',
    'Salt-and-Pepper Sweep',
  ],
  crew_cut: ['Crew Cut', 'Short Taper'],
  buzz_cut: ['Classic Buzz', 'Number-2 Buzz'],
  slick_back: [
    'Classic Slick Back',
    'Slick Back Side Part',
    'Business Flow',
    'Modern Slick',
  ],
  slick_back_undercut: ['Darmody', 'Shelby (Peaky Blinders)'],
  curtains: ['Middle Part Flow', '90s Curtains', 'Modern Curtains'],
  textured_fringe: ['Shelby Fringe', 'Modern Textured Fringe'],
  overgrown_buzz: ['Overgrown Buzz'],
  broccoli: ['Curly Taper', 'Curly Textured Top with Taper'],
  wolf_cut: ['Wolf Cut', 'Shaggy Flow'],
  modern_mullet: ['Modern Mullet', 'Low-Taper Mullet'],
  side_part_combover: [
    'Classic Side Part',
    'George Clooney Side Part',
    'Executive Side Part',
    'Tapered Side Part',
    'Hard-Part Side Part',
  ],
  pompadour: [
    'Classic Pompadour',
    'Modern Pompadour',
    'Hard-Part Pompadour',
    'Salt-and-Pepper Pompadour',
  ],
  bald_fade: ['Bald Fade'],
  short_fade: ['Short Fade'],
  bald_track: ['Bald Track'],
  clean_shave: ['Clean Shave (Bic’d)'],
  bro_flow: [
    'Classic Bro Flow',
    'Modern Loose Flow',
    'Surfer-style Flow',
  ],
  classic_sweep_back: [
    'Medium-Length Classic Sweep Back',
    'Executive Sweep',
    'Salt-and-Pepper Sweep Back',
  ],
};

export type CurrentRoutine = {
  cut_cadence_weeks: number | null;
  products_used: string | null;
  uses_blow_dry: boolean;
  who_cuts: WhoCuts | null;
};

export type HairAssessment = {
  user_id: string;
  face_shape: FaceShape;
  density_state: DensityState;
  hair_type_strand: HairTypeStrand;
  hair_type_pattern: HairTypePattern;
  hair_type_density: HairTypeDensity;
  current_routine: CurrentRoutine;
  hair_goal_text: string | null;
  report_text: string | null;
  report_generated_at: string | null;
  report_model: string | null;
  report_input_modifiers: ReportInputModifiers | null;
  // Stage 1 — cut strategy. All four nullable: stage 1 doesn't auto-run
  // when the report lands, the user clicks Generate to start it.
  stage_1_cut_family: CutFamily | null;
  stage_1_barber_text: string | null;
  stage_1_generated_at: string | null;
  stage_1_completed_at: string | null;
  // Stage 2 — density action. Path is null until the user locks one in.
  // pattern_d_goal_id is the pointer to the linked hair-loss-start-plan
  // goal when path === 'treat'. Null for monitor/transition or when we
  // failed to create/link the goal.
  stage_2_path: Stage2Path | null;
  stage_2_locked_in_at: string | null;
  stage_2_pattern_d_goal_id: string | null;
  // Stage 3 — product match. Single markdown blob (3 product picks for
  // the style track, 3-item scalp routine for the bald track). Acked
  // when the user confirms "I have what I need" — that's the gate to
  // Stage 4 because the daily routine literally requires product.
  stage_3_recommendation_text: string | null;
  stage_3_generated_at: string | null;
  stage_3_model: string | null;
  stage_3_acknowledged_at: string | null;
  // Stage 4 — daily styling routine. started_at is set when the user
  // opts in; target_check_ins is the modifier-aware unlock count
  // (default 14, eased to 7 for SSRI / stimulant users); completed_at
  // is set automatically when the user's check-in count hits the
  // target. Stage 4 is the first hair stage that PACES across weeks.
  stage_4_started_at: string | null;
  stage_4_target_check_ins: number | null;
  stage_4_completed_at: string | null;
  // Pattern D — Considering phase. Soft signal: user clicked
  // "I've started treatment" on the Considering surface. Distinct from
  // user_profile.current_interventions (which captures actual fin/min
  // status). Either signal flips the UI into On Protocol framing.
  pattern_d_treatment_started_at: string | null;
  // Stage 5 — monitoring habit (photo cadence). Perpetual — no
  // completion timestamp. Stage 6 unlocks when started, not when
  // complete. cadence_days is set at start time so later changes to
  // density_state or interventions don't retarget the schedule mid-run.
  stage_5_started_at: string | null;
  stage_5_cadence_days: number | null;
  stage_5_last_session_at: string | null;
  stage_5_session_count: number;
  // Stage 6 — maintenance + revisit triggers (terminal). Cut cadence
  // weeks is mostly an informational reminder; we don't currently log
  // "I got a cut" outside Stage 1. The framework calls Stage 6 "thin —
  // mostly settings."
  stage_6_started_at: string | null;
  stage_6_cut_cadence_weeks: number | null;
  created_at: string;
  updated_at: string;
};

// Snapshot of the inputs the report was generated against. Lives on the
// row so we can detect when a profile change has invalidated the report.
export type ReportInputModifiers = {
  hair_status: string | null;
  current_interventions: string[];
};

// User-facing labels. Single source for the assessment form and any
// summary surfaces (e.g. "your face shape: Round" on the report page).
export const FACE_SHAPE_LABEL: Record<FaceShape, string> = {
  oval: 'Oval',
  round: 'Round',
  square: 'Square',
  long_rectangular: 'Long / Rectangular',
  heart_triangle: 'Heart / Triangle',
};

export const FACE_SHAPE_HINT: Record<FaceShape, string> = {
  oval: 'Slightly longer than wide. Forehead and jaw look balanced.',
  round: 'Width and length feel similar. Softer jaw, fuller cheeks.',
  square: 'Strong jaw, broad forehead. Width and length fairly even.',
  long_rectangular: 'Clearly longer than wide.',
  heart_triangle: 'Forehead or cheekbones wider than the jaw.',
};

export const DENSITY_STATE_LABEL: Record<DensityState, string> = {
  full: 'Full density',
  mature_hairline: 'Mature hairline (slight temple recession, stable density)',
  receding_hairline: 'Receding hairline',
  crown_thinning: 'Crown thinning (scalp visible at the crown)',
  diffuse_thinning: 'Diffuse thinning (everywhere on top/mid-scalp)',
  advanced_thinning: 'Advanced thinning (scalp visibility dominates)',
  shaved_or_buzzed: 'Already shaved or buzzed and that’s the plan',
};

export const HAIR_TYPE_STRAND_LABEL: Record<HairTypeStrand, string> = {
  fine: 'Fine — strands hard to feel between fingers',
  medium: 'Medium — strands visible, hold some shape',
  thick_coarse: 'Thick / coarse — strands feel strong, wiry, dense',
};

export const HAIR_TYPE_PATTERN_LABEL: Record<HairTypePattern, string> = {
  straight: 'Straight',
  wavy: 'Wavy',
  curly: 'Curly',
  coily: 'Coily',
};

export const HAIR_TYPE_DENSITY_LABEL: Record<HairTypeDensity, string> = {
  low: 'Low — scalp shows easily through hair',
  medium: 'Medium — average coverage',
  high: 'High — thick coverage, hair feels dense on the head',
};

export const WHO_CUTS_LABEL: Record<WhoCuts, string> = {
  self: 'I cut it myself',
  chain: 'A chain (Supercuts, Great Clips, etc.)',
  dedicated_barber: 'A dedicated barber I picked',
};

// Zod schema for the assessment submission. Used by the route handler
// and re-exported for the form to keep client and server in lockstep.
export const HairAssessmentInputSchema = z.object({
  face_shape: z.enum([
    'oval',
    'round',
    'square',
    'long_rectangular',
    'heart_triangle',
  ]),
  density_state: z.enum([
    'full',
    'mature_hairline',
    'receding_hairline',
    'crown_thinning',
    'diffuse_thinning',
    'advanced_thinning',
    'shaved_or_buzzed',
  ]),
  hair_type_strand: z.enum(['fine', 'medium', 'thick_coarse']),
  hair_type_pattern: z.enum(['straight', 'wavy', 'curly', 'coily']),
  hair_type_density: z.enum(['low', 'medium', 'high']),
  current_routine: z.object({
    // Cut cadence in weeks. Null when the user doesn't have a routine.
    cut_cadence_weeks: z.number().int().min(1).max(52).nullable(),
    // Free-form list of products the user uses. Null when none.
    products_used: z.string().max(500).nullable(),
    uses_blow_dry: z.boolean(),
    who_cuts: z.enum(['self', 'chain', 'dedicated_barber']).nullable(),
  }),
  hair_goal_text: z.string().max(280).nullable(),
});

export type HairAssessmentInput = z.infer<typeof HairAssessmentInputSchema>;
