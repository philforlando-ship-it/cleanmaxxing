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
  frame_estimate: z.enum([
    'slim',
    'athletic',
    'regular',
    'broader',
    'heavier',
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
