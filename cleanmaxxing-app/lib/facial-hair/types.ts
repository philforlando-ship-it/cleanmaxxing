// Shared types + Zod schema for facial hair v0. Mirrors check
// constraints in supabase/migrations/0048_facial_hair_assessments.sql.

import { z } from 'zod';

export type CurrentState =
  | 'clean_shaven'
  | 'light_stubble'
  | 'heavy_stubble'
  | 'short_beard'
  | 'medium_beard'
  | 'long_beard';

export type GrowthQuality =
  | 'full'
  | 'mostly_full'
  | 'patchy'
  | 'very_patchy'
  | 'unsure';

// Per-area density (migration 0074). Replaces single growth_quality
// for new assessments; old assessments still carry growth_quality
// alone and the report prompt falls back to it when per-area is null.
export type DensityArea = 'full' | 'sparse' | 'patchy' | 'not_present';

export type FacialHairGoal =
  | 'grow_more'
  | 'style_what_i_have'
  | 'try_new_style'
  | 'stay_clean'
  | 'not_sure_yet';

export type TimeCommitment = 'low' | 'medium' | 'high';

export type FacialHairAssessment = {
  user_id: string;
  current_state: CurrentState;
  // Single growth slider — kept for legacy rows. New assessments
  // collect density_cheeks / density_chin / density_mustache instead
  // and leave this null. The report prompt prefers per-area when
  // present.
  growth_quality: GrowthQuality | null;
  density_cheeks: DensityArea | null;
  density_chin: DensityArea | null;
  density_mustache: DensityArea | null;
  goal: FacialHairGoal;
  time_commitment: TimeCommitment;
  facial_hair_goal_text: string | null;
  // Stage milestones (migration 0060) — 4-week grow-out test for
  // 'not_sure_yet' or 'try_new_style' users. Two timestamps because
  // there's a clear before/after: started_at = user committed to the
  // test; completed_at = user finished and is ready to evaluate.
  growout_test_started_at: string | null;
  growout_test_completed_at: string | null;
  // Stage milestone (migration 0076) — minoxidil-for-beard. Distinct
  // from profile.current_interventions which can't separate scalp use
  // from beard use. When set, the report shifts from "consider
  // minoxidil" to month-band framing (0-3 mo shedding phase, 3-6 mo
  // early progress, 12+ mo evaluation point).
  minoxidil_for_beard_started_at: string | null;
  report_text: string | null;
  report_generated_at: string | null;
  report_model: string | null;
  report_input_modifiers: FacialHairReportInputModifiers | null;
  created_at: string;
  updated_at: string;
};

export type FacialHairReportInputModifiers = {
  current_interventions: string[];
  age: number | null;
  face_shape: string | null;
  // Body fat as a jaw-definition proxy (2026-05-09). Body fat masks
  // the underlying jaw and cheekbone structure; a high-bf face has
  // its bone structure hidden by adipose regardless of how strong
  // it actually is. The facial-hair prompt uses this to bias toward
  // beard shapes that create the visible jaw line that body fat is
  // currently hiding (high bf) vs honoring the visible bone
  // structure that's already doing the work (low bf).
  bf_pct_self_estimate: string | null;
  // Per-area density (migration 0074). Null on legacy rows; the
  // prompt falls back to growth_quality when these are unset.
  density_cheeks: DensityArea | null;
  density_chin: DensityArea | null;
  density_mustache: DensityArea | null;
  // Stage milestones — 4-week grow-out test. Two timestamps so the
  // prompt can branch between "in progress" (don't recommend style
  // changes) and "complete" (acknowledge the data is in).
  growout_test_started_at: string | null;
  growout_test_completed_at: string | null;
  // Stage milestone — minoxidil-for-beard. Distinct from
  // profile.current_interventions; null when the user hasn't started
  // beard-specific use of the drug.
  minoxidil_for_beard_started_at: string | null;
};

export const CURRENT_STATE_LABEL: Record<CurrentState, string> = {
  clean_shaven: 'Clean shaven',
  light_stubble: 'Light stubble (1–3 days growth)',
  heavy_stubble: 'Heavy stubble (4–7 days)',
  short_beard: 'Short beard (1–3 weeks)',
  medium_beard: 'Medium beard (1–3 months)',
  long_beard: 'Long beard (3+ months)',
};

export const GROWTH_QUALITY_LABEL: Record<GrowthQuality, string> = {
  full: 'Full — comes in dense and connects well',
  mostly_full: 'Mostly full — dense overall, a few thin spots',
  patchy: 'Patchy — visible gaps that don’t fill in',
  very_patchy: 'Very patchy — significant gaps that won’t connect',
  unsure: 'Not sure — haven’t grown it out long enough to know',
};

export const FACIAL_HAIR_GOAL_LABEL: Record<FacialHairGoal, string> = {
  grow_more: 'Grow it longer or fuller than it is now',
  style_what_i_have: 'Style what I have better (shape, define, maintain)',
  try_new_style: 'Try a new style',
  stay_clean: 'Stay clean shaven or minimal',
  not_sure_yet: 'Not sure yet',
};

export const TIME_COMMITMENT_LABEL: Record<TimeCommitment, string> = {
  low: 'Low — 1–2 minutes a day, basic upkeep',
  medium: 'Medium — 5–10 minutes a day, regular trimming',
  high: 'High — including barber visits and a product routine',
};

export const DENSITY_AREA_LABEL: Record<DensityArea, string> = {
  full: 'Full — comes in dense, no visible gaps',
  sparse: 'Sparse — connects but thin throughout',
  patchy: 'Patchy — visible gaps that don’t fill in',
  not_present: 'Essentially no growth here',
};

// Reference catalog — the 12 styles in public/images/facial-hair-styles/.
// Used as a visual aid inside the assessment form (so the user can see
// what each label looks like) and as a vocabulary for the report.
// Slugs match filenames; image_path is the absolute public URL.
export type FacialHairStyleSlug =
  | 'clean_shaven'
  | 'light_stubble'
  | 'heavy_stubble'
  | 'chevron_mustache'
  | 'classic_mustache'
  | 'goatee_with_mustache'
  | 'circle_beard'
  | 'chinstrap_beard'
  | 'short_boxed_beard'
  | 'medium_full_beard'
  | 'corporate_beard'
  | 'ducktail_beard';

export type FacialHairStyle = {
  slug: FacialHairStyleSlug;
  label: string;
  image_path: string;
  // One-liner. Used in the report-prompt vocabulary block so the model
  // can pick a fitting style by name without confabulating.
  blurb: string;
};

export const FACIAL_HAIR_STYLES: ReadonlyArray<FacialHairStyle> = [
  {
    slug: 'clean_shaven',
    label: 'Clean shaven',
    image_path: '/images/facial-hair-styles/clean_shaven.png',
    blurb: 'Bare skin. Daily shave. Reads sharp and intentional.',
  },
  {
    slug: 'light_stubble',
    label: 'Light stubble',
    image_path: '/images/facial-hair-styles/light_stubble.png',
    blurb: 'A few days of growth. Soft texture, no shaping required.',
  },
  {
    slug: 'heavy_stubble',
    label: 'Heavy stubble',
    image_path: '/images/facial-hair-styles/heavy_stubble.png',
    blurb: 'Roughly a week of growth held in place. The default rugged setting.',
  },
  {
    slug: 'chevron_mustache',
    label: 'Chevron mustache',
    image_path: '/images/facial-hair-styles/chevron_mustache.png',
    blurb: 'Thick, full mustache that covers the upper lip. Distinctive on its own.',
  },
  {
    slug: 'classic_mustache',
    label: 'Classic mustache',
    image_path: '/images/facial-hair-styles/classic_mustache.png',
    blurb: 'Trimmed, neat, sits cleanly above the lip line.',
  },
  {
    slug: 'goatee_with_mustache',
    label: 'Goatee with mustache',
    image_path: '/images/facial-hair-styles/goatee_with_mustache.png',
    blurb: 'Mustache connected to a small chin patch. Frames the mouth.',
  },
  {
    slug: 'circle_beard',
    label: 'Circle beard',
    image_path: '/images/facial-hair-styles/circle_beard.png',
    blurb: 'Mustache + connected rounded chin patch. Compact, well-defined.',
  },
  {
    slug: 'chinstrap_beard',
    label: 'Chinstrap beard',
    image_path: '/images/facial-hair-styles/chinstrap_beard.png',
    blurb: 'Thin line tracing the jaw. High-effort upkeep, polarizing.',
  },
  {
    slug: 'short_boxed_beard',
    label: 'Short boxed beard',
    image_path: '/images/facial-hair-styles/short_boxed_beard.png',
    blurb: 'Short, even all-around beard with clean lines. The reliable default.',
  },
  {
    slug: 'medium_full_beard',
    label: 'Medium full beard',
    image_path: '/images/facial-hair-styles/medium_full_beard.png',
    blurb: 'A few months of growth, shaped and maintained. Substantial but tidy.',
  },
  {
    slug: 'corporate_beard',
    label: 'Corporate beard',
    image_path: '/images/facial-hair-styles/corporate_beard.png',
    blurb: 'Short, sharply lined, conservative shape. Reads professional.',
  },
  {
    slug: 'ducktail_beard',
    label: 'Ducktail beard',
    image_path: '/images/facial-hair-styles/ducktail_beard.png',
    blurb: 'Longer beard that tapers to a point at the chin. High-commitment look.',
  },
];

export const FacialHairAssessmentInputSchema = z.object({
  current_state: z.enum([
    'clean_shaven',
    'light_stubble',
    'heavy_stubble',
    'short_beard',
    'medium_beard',
    'long_beard',
  ]),
  density_cheeks: z.enum(['full', 'sparse', 'patchy', 'not_present']),
  density_chin: z.enum(['full', 'sparse', 'patchy', 'not_present']),
  density_mustache: z.enum(['full', 'sparse', 'patchy', 'not_present']),
  goal: z.enum([
    'grow_more',
    'style_what_i_have',
    'try_new_style',
    'stay_clean',
    'not_sure_yet',
  ]),
  time_commitment: z.enum(['low', 'medium', 'high']),
  facial_hair_goal_text: z.string().max(280).nullable(),
});

export type FacialHairAssessmentInput = z.infer<
  typeof FacialHairAssessmentInputSchema
>;
