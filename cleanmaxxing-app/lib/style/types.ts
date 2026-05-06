// Shared types + Zod schema for style v0. Mirrors check constraints in
// supabase/migrations/0043_style_assessments.sql.

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
