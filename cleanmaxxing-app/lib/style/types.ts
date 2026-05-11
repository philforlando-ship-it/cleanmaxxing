// Shared types + Zod schemas for the style plan. Mirrors check
// constraints in supabase/migrations/0043_style_assessments.sql and
// the stage columns added in 0064_style_assessments_stages_1_to_3.sql.

import { z } from 'zod';

export type FrameEstimate =
  | 'slim'
  | 'athletic'
  | 'regular'
  | 'broader'
  | 'heavier';

// Style v2 granular body dimensions (migration 0093, 2026-05-09).
// Replace the single coarse frame_estimate input with the five axes
// POV 12's Guzy + RMRS framework actually uses to drive silhouette
// rules. frame_estimate is retained as a derived legacy field for
// backwards-compat with downstream consumers (cut-menu density,
// foundation-pieces content, prompt rules already branched on it).

export type ShoulderWidth = 'narrow' | 'medium' | 'broad';
export type ArmLength = 'short' | 'proportional' | 'long';
export type LegLength = 'short' | 'proportional' | 'long';
export type Build = 'slight' | 'athletic' | 'stocky' | 'heavyset';
// Migration 0097 (2026-05-09) — orthogonal density axis. Resolves
// the missing "broad athletic" / mesomorph bucket between athletic
// and stocky, plus the athletic-with-a-layer / dad-bod-with-history
// case, without exploding the Build enum.
export type FrameDensity = 'lean' | 'dense' | 'soft';
export type SkinUndertone = 'cool' | 'warm' | 'neutral';

// Migration 0099 (2026-05-10) — eye color axis. Universal-applicable
// color tiebreak that works regardless of hair / beard presence.
// Used by ColorPaletteCard to resolve the neutral-undertone tiebreak
// and by the style report-prompt as a modifier.
export type EyeColor =
  | 'blue'
  | 'grey'
  | 'green'
  | 'hazel'
  | 'brown'
  | 'dark_brown';

// Migration 0102 (2026-05-10) — wrist_size + dress_code_context.
// Two segmentation axes the per-component POV library needs that the
// v2 reframe didn't capture. wrist_size drives watch dial sizing
// (small ~36-39mm, average ~38-41mm, large ~40-43mm). dress_code_
// context drives footwear / outerwear / shirt formality bias —
// independent of target_archetype (a clean-minimalist in finance and
// a clean-minimalist WFH need different prescriptions).
export type WristSize = 'small' | 'average' | 'large';

export type DressCodeContext =
  | 'corporate'
  | 'business_casual'
  | 'creative'
  | 'casual_wfh'
  | 'blue_collar'
  | 'mixed';

export const SHOULDER_WIDTHS: ReadonlyArray<ShoulderWidth> = [
  'narrow',
  'medium',
  'broad',
];

export const ARM_LENGTHS: ReadonlyArray<ArmLength> = [
  'short',
  'proportional',
  'long',
];

export const LEG_LENGTHS: ReadonlyArray<LegLength> = [
  'short',
  'proportional',
  'long',
];

export const BUILDS: ReadonlyArray<Build> = [
  'slight',
  'athletic',
  'stocky',
  'heavyset',
];

export const FRAME_DENSITIES: ReadonlyArray<FrameDensity> = [
  'lean',
  'dense',
  'soft',
];

export const SKIN_UNDERTONES: ReadonlyArray<SkinUndertone> = [
  'cool',
  'warm',
  'neutral',
];

export const EYE_COLORS: ReadonlyArray<EyeColor> = [
  'blue',
  'grey',
  'green',
  'hazel',
  'brown',
  'dark_brown',
];

export const WRIST_SIZES: ReadonlyArray<WristSize> = [
  'small',
  'average',
  'large',
];

export const DRESS_CODE_CONTEXTS: ReadonlyArray<DressCodeContext> = [
  'corporate',
  'business_casual',
  'creative',
  'casual_wfh',
  'blue_collar',
  'mixed',
];

export const EYE_COLOR_LABEL: Record<EyeColor, string> = {
  blue: 'Blue',
  grey: 'Grey',
  green: 'Green',
  hazel: 'Hazel — green or brown with amber/golden flecks',
  brown: 'Brown — medium or light',
  dark_brown: 'Dark brown — very dark, near-black',
};

// How the eye color leans on the warm/cool axis. Used by
// ColorPaletteCard to resolve the neutral-undertone tiebreak,
// and by report prompts as a modifier signal.
//   blue, grey            → cool
//   hazel, brown, dark_b. → warm
//   green                 → null (genuinely doesn't lean)
export function eyeColorLean(eye: EyeColor): 'cool' | 'warm' | null {
  if (eye === 'blue' || eye === 'grey') return 'cool';
  if (eye === 'hazel' || eye === 'brown' || eye === 'dark_brown') return 'warm';
  return null;
}

export const SHOULDER_WIDTH_LABEL: Record<ShoulderWidth, string> = {
  narrow: 'Narrow — shoulders read narrower than waist or about even',
  medium: 'Medium — shoulders sit roughly proportional to waist',
  broad:
    'Broad — shoulders visibly wider than waist (inverted triangle / V-taper)',
};

export const ARM_LENGTH_LABEL: Record<ArmLength, string> = {
  short:
    'Short — sleeves run long off the rack, cuffs cover wrist bone',
  proportional:
    'Proportional — sleeves usually fit at the right length',
  long:
    'Long — sleeves run short off the rack, wrist bone visible',
};

export const LEG_LENGTH_LABEL: Record<LegLength, string> = {
  short:
    'Short — long-torso/short-legs (pants run long; the highest-leverage proportion lever)',
  proportional: 'Proportional — torso-to-leg ratio is balanced',
  long: 'Long — short-torso/long-legs (pants often need hemming up)',
};

export const BUILD_LABEL: Record<Build, string> = {
  slight: 'Slight — lean / lighter frame',
  athletic: 'Athletic — visible muscle, lean-to-medium body fat',
  stocky:
    'Stocky — broader-and-shorter (different from "muscular and tall")',
  heavyset: 'Heavyset — carrying meaningful body fat throughout',
};

export const FRAME_DENSITY_LABEL: Record<FrameDensity, string> = {
  lean:
    'Lean — low body fat, lines visible, no soft layer over the frame',
  dense:
    'Dense — visible muscle, tight skin, weight reads as muscle not fat',
  soft:
    'Soft — has a layer over the underlying frame; not heavyset, just not lean',
};

export const SKIN_UNDERTONE_LABEL: Record<SkinUndertone, string> = {
  cool: 'Cool — silver/platinum jewelry flatters more than gold',
  warm: 'Warm — gold/brass jewelry flatters more than silver',
  neutral:
    'Neutral — both jewelry tones look fine; you can wear most colors',
};

export const WRIST_SIZE_LABEL: Record<WristSize, string> = {
  small:
    'Small — under ~6.75" / 17cm circumference. Most off-the-rack watches read oversized.',
  average:
    'Average — ~6.75–7.5" / 17–19cm. Most watch sizes fit; this is the design center.',
  large:
    'Large — over ~7.5" / 19cm. Smaller dress watches read undersized; oversized cases work better here than on most.',
};

export const DRESS_CODE_CONTEXT_LABEL: Record<DressCodeContext, string> = {
  corporate:
    'Corporate — suits / tailored separates most days. Finance, law, consulting, formal client-facing.',
  business_casual:
    'Business casual — collared shirts + chinos / trousers, occasional blazer. Most office jobs.',
  creative:
    'Creative — visual / agency / tech where intentional style is expected and rewarded.',
  casual_wfh:
    'Casual / WFH — remote or near-fully-casual. Jeans + tee or polo most days, dress up only for occasions.',
  blue_collar:
    'Blue collar / trades — workwear / uniform most days. Style is for off-work life.',
  mixed:
    'Mixed — varies meaningfully across the week (e.g., hybrid roles, client days vs. internal days).',
};

// Derive the legacy frame_estimate from the v2 granular fields.
// Used in the API route on submit so existing downstream consumers
// (cut-menu density gate, foundation-pieces content, prompt rules
// branched on frame_estimate) keep working with v1 semantics. The
// mapping deliberately collapses the five-bucket label onto the v2
// (shoulder_width × build) axes:
//   heavyset build         → 'heavier'
//   stocky build           → 'broader'
//   athletic + broad       → 'athletic'
//   athletic + narrow|med  → 'athletic'
//   slight                 → 'slim'
//   anything else          → 'regular'
export function deriveFrameEstimate(
  shoulder_width: ShoulderWidth,
  build: Build,
): FrameEstimate {
  if (build === 'heavyset') return 'heavier';
  if (build === 'stocky') return 'broader';
  if (build === 'athletic') return 'athletic';
  if (build === 'slight') return 'slim';
  // Defensive: should be unreachable since Build is a closed union,
  // but TypeScript can't prove that without the explicit return.
  return 'regular';
}

export type StyleArchetype =
  | 'clean_minimalist'
  | 'athletic_casual'
  | 'rugged_masculine'
  | 'mature_professional'
  | 'streetwear'
  | 'creative_eclectic';

// 'no_clear_archetype' is allowed for current_archetype only — it's the
// honest answer for a user who hasn't been intentional about style yet.
// The target_archetype must be one of the six named archetypes.
export type CurrentArchetype = StyleArchetype | 'no_clear_archetype';

export type ClosetState =
  | 'well_curated'
  | 'functional'
  | 'outdated'
  | 'starting_from_scratch';

// Stage 1 — closet audit. The user marks each archetype-specific chip
// keep/cut/replace. The actual chip catalog lives in
// lib/style/closet-audit-content.ts; the slug strings are validated
// against that catalog at the API boundary.
export type ClosetAuditDirection = 'keep' | 'cut' | 'replace';

export type ClosetAuditSelections = Record<string, ClosetAuditDirection>;

// Stage 2 — foundation pieces. Slug strings are validated at the API
// boundary against lib/style/foundation-pieces-content.ts.

export type StyleAssessment = {
  user_id: string;
  // Migration 0093 (2026-05-09) — v2 granular body dimensions.
  // Nullable on pre-migration rows; v2 form requires them on submit.
  shoulder_width: ShoulderWidth | null;
  arm_length: ArmLength | null;
  leg_length: LegLength | null;
  build: Build | null;
  // Migration 0097 (2026-05-09) — orthogonal density axis.
  frame_density: FrameDensity | null;
  skin_undertone: SkinUndertone | null;
  // Migration 0099 (2026-05-10) — universal-applicable color tiebreak.
  eye_color: EyeColor | null;
  // Migration 0102 (2026-05-10) — wrist_size drives watch dial sizing;
  // dress_code_context drives footwear/outerwear formality bias
  // independent of target_archetype. Both nullable on pre-migration
  // rows; v2 form requires them on next submit.
  wrist_size: WristSize | null;
  dress_code_context: DressCodeContext | null;
  // Legacy v1 frame_estimate — derived from build + shoulder_width
  // when the v2 form is submitted. Retained so existing call sites
  // don't churn (cut-menu density gate, foundation-pieces content,
  // prompt rules).
  frame_estimate: FrameEstimate;
  current_archetype: CurrentArchetype;
  target_archetype: StyleArchetype;
  closet_state: ClosetState;
  style_goal_text: string | null;
  report_text: string | null;
  report_generated_at: string | null;
  report_model: string | null;
  report_input_modifiers: StyleReportInputModifiers | null;
  // Stage 1 — closet audit
  stage_1_chip_selections: ClosetAuditSelections | null;
  stage_1_audit_text: string | null;
  stage_1_generated_at: string | null;
  stage_1_completed_at: string | null;
  // Stage 2 — foundation pieces
  stage_2_pieces_acquired: string[];
  stage_2_completed_at: string | null;
  // Stage 3 — fit calibration
  stage_3_acknowledged_at: string | null;
  created_at: string;
  updated_at: string;
};

export type StyleReportInputModifiers = {
  bf_pct_self_estimate: string | null;
  budget_tier: string | null;
  current_interventions: string[];
  // Age drives the Style Past 45 register (dad-fit trap, slim-cut trap,
  // blazer as default layer, glasses as face-frame variable). The
  // mid-30s+ branch also tilts on this.
  age: number | null;
  // V2 granular body dimensions (migration 0093, 2026-05-09).
  // Snapshotted at gen time so the report's silhouette reasoning is
  // reproducible. Null when the user has a v1-era assessment that
  // hasn't been re-submitted on the v2 form.
  shoulder_width: ShoulderWidth | null;
  arm_length: ArmLength | null;
  leg_length: LegLength | null;
  build: Build | null;
  // Migration 0097 — orthogonal density axis (lean / dense / soft).
  // Combined with build, the prompt branches on combos like
  // athletic+dense (broad-athletic / mesomorph) and athletic+soft
  // (dad-bod-with-history) that the build axis alone couldn't
  // distinguish.
  frame_density: FrameDensity | null;
  skin_undertone: SkinUndertone | null;
  // Migration 0099 — universal-applicable color tiebreak.
  eye_color: EyeColor | null;
  // Migration 0102 — segmentation axes for the per-component POV
  // library. wrist_size gates watch dial sizing recs; dress_code_
  // context gates footwear / outerwear / shirt formality bias.
  wrist_size: WristSize | null;
  dress_code_context: DressCodeContext | null;
  // 2026-05-10 hair × style coordination (mirror of D1/D2). The style
  // report reads the user's hair_assessments balding signal so the
  // sunglasses / hats / glasses prescription accounts for face-frame
  // architecture. Null when the user hasn't taken the hair journey.
  hair_balding_pattern:
    | 'none'
    | 'front'
    | 'vertex'
    | 'front_and_vertex'
    | 'diffuse'
    | null;
  hair_balding_severity: 0 | 1 | 2 | 3 | 4 | null;
  hair_density_state: string | null;
  // Phase 2b — per-user feasibility of the PICKED target archetype.
  // Computed from body data + age via lib/style/aesthetic-feasibility.
  // Snapshotted so the prompt can branch on whether the user picked
  // an aesthetic that fits / works / fights their frame. Null when
  // body data is insufficient to compute (legacy v1 assessments).
  target_archetype_feasibility_tier:
    | 'strong_fit'
    | 'workable'
    | 'fights_your_frame'
    | null;
  target_archetype_feasibility_rationale: string | null;
};

export const FRAME_ESTIMATE_LABEL: Record<FrameEstimate, string> = {
  slim: 'Slim — narrow shoulders, lean build',
  athletic: 'Athletic — visible muscle, defined V-taper',
  regular: 'Regular — average build, no extremes',
  broader: 'Broader — wider build, not necessarily heavier',
  heavier: 'Heavier — carrying meaningful body fat',
};

export const ARCHETYPE_LABEL: Record<CurrentArchetype, string> = {
  clean_minimalist: 'Clean minimalist',
  athletic_casual: 'Athletic casual',
  rugged_masculine: 'Rugged & masculine',
  mature_professional: 'Mature professional',
  streetwear: 'Streetwear',
  creative_eclectic: 'Creative / eclectic',
  no_clear_archetype: 'No clear archetype yet',
};

export const ARCHETYPE_HINT: Record<CurrentArchetype, string> = {
  clean_minimalist:
    'Neutral colors, sharp fits, no logos. Reads effortless and put-together.',
  athletic_casual:
    'Fitted performance-leaning pieces. Subtly shows physique. Active vibe.',
  rugged_masculine:
    'Denim, boots, heavier textures. Grounded. Best when face and build support it.',
  mature_professional:
    'Tailored, blazer-default. Reads adult and considered. Right register past 40.',
  streetwear: 'Contemporary urban. More visual interest, intentional contrast.',
  creative_eclectic:
    'Artistic, layered, expressive. Reads as someone with a point of view.',
  no_clear_archetype:
    "You're not dressing as anything in particular yet. That's fine — it's the starting point.",
};

// V2 aesthetic-feasibility hints (style v2 reframe, 2026-05-09).
// Surfaced under each target_archetype option so users see the
// realistic feasibility floor per POV 12's Guzy + RMRS framework
// before committing. These are static rule-of-thumb hints — not
// per-user computed. Per-user feasibility (e.g. "rugged fights your
// frame because you picked slight build") could layer on top later.
export const ARCHETYPE_FEASIBILITY_HINT: Record<StyleArchetype, string> = {
  clean_minimalist:
    'Works best on lean-to-athletic builds. The silhouette is unforgiving — no decorative cover for fit problems. Beards conflict with the visual cleanness. ~50% of men execute it well.',
  athletic_casual:
    'Most body-agnostic of the archetypes. Polo or button-down + chinos + clean leather sneakers works on virtually every body if fit is right. ~85%+ feasibility — the safest default.',
  rugged_masculine:
    'Works best on broader builds (athletic to stocky), 5’9"+, with at least heavy stubble (a beard helps). Slight + clean-shaven men in workwear read costume-y. ~40% of men can credibly execute it.',
  mature_professional:
    'Most universally accessible — tailoring fixes most fit issues. Works on slight, athletic, stocky, and heavyset alike given budget + tailoring. ~75%+ feasibility. Failure modes: poorly-fitted suits, cheap shoes.',
  streetwear:
    'Body-flexible BUT age-coded — full streetwear past ~38 reads try-too-hard. Streetwear-adjacent (sneakers + clean tee + relaxed pants) ages up better and is what most 32–45 men should aim for.',
  creative_eclectic:
    'Requires personality coherence. Standalone Rakish elements (visible jewelry, statement pieces) need either a body/face that anchors them OR coherent eclectic styling throughout the outfit, otherwise they read incongruent.',
};

export const CLOSET_STATE_LABEL: Record<ClosetState, string> = {
  well_curated:
    'Well curated — most pieces fit, the wardrobe holds together',
  functional:
    "Functional — works day-to-day but no real intent behind it",
  outdated: 'Outdated — pieces from years ago dominate the rotation',
  starting_from_scratch:
    'Starting from scratch — not enough pieces, or none that align',
};

export const StyleAssessmentInputSchema = z.object({
  // V2 granular body dimensions (migration 0093). frame_estimate is
  // derived server-side from build + shoulder_width; clients submit
  // the granular fields, the API derives the legacy field for
  // downstream consumers that still read it.
  shoulder_width: z.enum(['narrow', 'medium', 'broad']),
  arm_length: z.enum(['short', 'proportional', 'long']),
  leg_length: z.enum(['short', 'proportional', 'long']),
  build: z.enum(['slight', 'athletic', 'stocky', 'heavyset']),
  frame_density: z.enum(['lean', 'dense', 'soft']),
  skin_undertone: z.enum(['cool', 'warm', 'neutral']),
  eye_color: z.enum([
    'blue',
    'grey',
    'green',
    'hazel',
    'brown',
    'dark_brown',
  ]),
  wrist_size: z.enum(['small', 'average', 'large']),
  dress_code_context: z.enum([
    'corporate',
    'business_casual',
    'creative',
    'casual_wfh',
    'blue_collar',
    'mixed',
  ]),
  current_archetype: z.enum([
    'clean_minimalist',
    'athletic_casual',
    'rugged_masculine',
    'mature_professional',
    'streetwear',
    'creative_eclectic',
    'no_clear_archetype',
  ]),
  target_archetype: z.enum([
    'clean_minimalist',
    'athletic_casual',
    'rugged_masculine',
    'mature_professional',
    'streetwear',
    'creative_eclectic',
  ]),
  closet_state: z.enum([
    'well_curated',
    'functional',
    'outdated',
    'starting_from_scratch',
  ]),
  style_goal_text: z.string().max(280).nullable(),
});

export type StyleAssessmentInput = z.infer<
  typeof StyleAssessmentInputSchema
>;

// Stage 1 — closet audit chip submission. The route handler verifies
// every key is a known chip slug for the user's target_archetype
// against lib/style/closet-audit-content.ts; this Zod schema only
// enforces shape.
export const StyleStage1AuditSchema = z.object({
  chip_selections: z.record(
    z.string(),
    z.enum(['keep', 'cut', 'replace']),
  ),
});

export type StyleStage1AuditInput = z.infer<typeof StyleStage1AuditSchema>;

// Stage 2 — toggle a foundation piece slug acquired/not. The route
// handler verifies the slug belongs to the user's archetype catalog.
export const StyleStage2PieceToggleSchema = z.object({
  piece_slug: z.string().min(1).max(80),
  acquired: z.boolean(),
});

export type StyleStage2PieceToggleInput = z.infer<
  typeof StyleStage2PieceToggleSchema
>;
