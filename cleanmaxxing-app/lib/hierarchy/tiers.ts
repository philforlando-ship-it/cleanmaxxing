// Looksmaxxing system tier map — the framework view for /system.
//
// Source of truth: POV 15 (15-looksmaxxing-system.md). The five-layer
// framework + tier list is authored there as prose; this file is the
// structured projection used by the /system page to render the
// hierarchy and highlight where the user's active focus areas sit.
//
// Tiers here mirror priority_tier values in pov_docs (tier-1 through
// tier-5). Conditional / advanced / monitor / avoid POVs are handled
// separately by the page (rendered in a "context" rail, not the main
// hierarchy) so the framework view stays clean and aspirational.
//
// IMPORTANT: this file owns the *display text* for the framework view.
// The priority_tier values come from content/povs/_metadata.json (which
// embed-povs writes to pov_docs). If you change the tier vocabulary
// upstream, update both places.
//
// Wording lifted directly from POV 15 to avoid divergence between the
// reader-facing prose and the framework-view labels.

export type TierKey = 'tier-1' | 'tier-2' | 'tier-3' | 'tier-4' | 'tier-5';

export const TIER_ORDER: ReadonlyArray<TierKey> = [
  'tier-1',
  'tier-2',
  'tier-3',
  'tier-4',
  'tier-5',
];

type TierInfo = {
  shortLabel: string;
  longLabel: string;
  description: string;
};

export const TIER_INFO: Record<TierKey, TierInfo> = {
  'tier-1': {
    shortLabel: 'Tier 1',
    longLabel: 'Non-negotiable foundation',
    description:
      'The biggest mistake in looksmaxxing culture is misplaced focus — obsessing over eye shape and skull structure while ignoring body fat, skin, hair, and posture. This is where effort delivers the highest returns.',
  },
  'tier-2': {
    shortLabel: 'Tier 2',
    longLabel: 'High impact, address early',
    description:
      'Once the foundation is solid, these are the highest-leverage levers for how your raw material is presented — fit, contrast, and definition. Most of the gap between "fine" and "sharp" lives here.',
  },
  'tier-3': {
    shortLabel: 'Tier 3',
    longLabel: 'Meaningful refinements',
    description:
      'Refinement layer. Each one is real, none of them substitute for the foundation. Worth doing once the floor underneath is stable.',
  },
  'tier-4': {
    shortLabel: 'Tier 4',
    longLabel: 'What separates top performers',
    description:
      'Where appearance stops being static and becomes experienced. Presence, voice, movement, identity. You can be visually strong on tiers 1–3 and still read as a five rather than an eight depending on how you carry yourself.',
  },
  'tier-5': {
    shortLabel: 'Tier 5',
    longLabel: 'Polish and finishing',
    description:
      'The last mile. Real but small effects, with sharply diminishing returns if anything below is unfinished. Add late, not first.',
  },
};

// The 8 shipped journeys (focus areas) with the path to their plan
// surface. Single source of truth shared by /system, /today, and
// anywhere else that needs to route from a focus_area to its plan.
// body_composition's plan home is /plan/nutrition (no standalone
// body-composition page; the nutrition plan IS the body-comp surface).
export type FocusAreaSlug =
  | 'hair'
  | 'style'
  | 'body_composition'
  | 'strength'
  | 'cardio'
  | 'sleep'
  | 'skincare'
  | 'facial_hair'
  | 'facial_structure';

// User-facing journey labels. The `body_composition` slug renders as
// "Nutrition" everywhere because the journey itself is about nutrition
// inputs (macros, calorie target, protein floor, dietary preferences,
// fasting protocol) — body composition is the OUTCOME that work
// produces, not the journey name. Internal slug stays `body_composition`
// so persisted survey_responses rows + journey-state mappings + DB
// references don't have to migrate.
export const FOCUS_AREA_LABEL: Record<FocusAreaSlug, string> = {
  hair: 'Hair',
  style: 'Style',
  body_composition: 'Nutrition',
  strength: 'Strength',
  cardio: 'Cardio',
  sleep: 'Sleep',
  skincare: 'Skincare',
  facial_hair: 'Facial hair',
  facial_structure: 'Facial structure',
};

export const FOCUS_AREA_TO_PLAN_PATH: Record<FocusAreaSlug, string> = {
  hair: '/plan/hair',
  style: '/plan/style',
  body_composition: '/plan/nutrition',
  strength: '/plan/strength',
  cardio: '/plan/cardio',
  sleep: '/plan/sleep',
  skincare: '/plan/skincare',
  facial_hair: '/plan/facial-hair',
  facial_structure: '/plan/facial-structure',
};

// Map onboarding focus_areas → canonical POV slug. Used to highlight
// the user's active journeys inside the tier list. Not every journey
// has a one-to-one POV — body_composition is anchored on the physical
// foundation POV (rather than diet-macros) because that's the POV the
// journey-report prompt cites first; if the canonical anchor changes,
// update here.
export const FOCUS_AREA_TO_POV_SLUG: Record<FocusAreaSlug, string> = {
  hair: '08-head-hair-balding',
  style: '12-style-clothing',
  body_composition: '13-body-physical-foundation',
  strength: '19-strength-training',
  cardio: '23-cardio',
  sleep: '42-sleep',
  skincare: '07-skincare-antiaging',
  facial_hair: '09-facial-hair',
  facial_structure: '16-facial-definition-jawline',
};

// Reverse lookup — given a POV slug, get the focus_area it represents
// (or null if the POV isn't journey-anchored). Used by the renderer to
// stamp the "your journey" highlight on rows that match.
const POV_SLUG_TO_FOCUS_AREA: Record<string, FocusAreaSlug> = Object.fromEntries(
  (Object.entries(FOCUS_AREA_TO_POV_SLUG) as Array<[FocusAreaSlug, string]>).map(
    ([fa, slug]) => [slug, fa],
  ),
) as Record<string, FocusAreaSlug>;

export function focusAreaForPovSlug(slug: string): FocusAreaSlug | null {
  return POV_SLUG_TO_FOCUS_AREA[slug] ?? null;
}

// Parent-journey attribution for non-anchor POVs. Mirrors
// content/povs/_metadata.json's parent_focus_area field. A POV's
// parent is either the focus_area it's a CHAPTER of (e.g.
// 31-calorie-macro-framework → body_composition; the calculator is
// nutrition-journey content, not standalone reading) OR null when
// the POV is genuinely cross-cutting / has no journey home (meta,
// safety, advanced medical).
//
// Anchor POVs (the 8 in FOCUS_AREA_TO_POV_SLUG) are NOT in this
// map — their journey identity is FOCUS_AREA_TO_POV_SLUG itself.
// parentFocusAreaForPovSlug() returns the anchor's own focus_area
// for those slugs so consumers can ask "what journey does this
// POV belong to" with one call.
//
// Keep this in sync with content/povs/_metadata.json. Source of
// truth lives in the JSON; this is the read surface for runtime
// rendering (avoids a DB column + migration for the v0 of /system
// journey-attribution).
const POV_PARENT_FOCUS_AREA: Record<string, FocusAreaSlug> = {
  '02-glp1s': 'body_composition',
  '16-facial-definition-jawline': 'body_composition',
  '18-tanning': 'skincare',
  '20-diet-macros': 'body_composition',
  '21-protein-creatine': 'body_composition',
  '22-carbohydrates-fasting': 'body_composition',
  '24-alcohol-cannabis': 'sleep',
  '25-acne': 'skincare',
  '26-training-while-enhanced': 'strength',
  '27-hair-loss-treatments': 'hair',
  '30-appetite-control': 'body_composition',
  '31-calorie-macro-framework': 'body_composition',
  '32-skin-texture-scarring': 'skincare',
  '34-recovery-tools-polish': 'strength',
  '35-gut-health-fiber': 'body_composition',
  '36-fat-burners': 'body_composition',
  '44-water-retention': 'body_composition',
  '45-meal-plans': 'body_composition',
  '46-mobility': 'strength',
  '48-skin-tone-guidance': 'style',
  '49-nicotine-vaping': 'sleep',
  '50-posture': 'strength',
  '57-skin-conditions': 'skincare',
  '58-hair-systems-prosthetics': 'hair',
};

// Returns the journey a POV belongs to, whether it's the journey's
// own anchor (returns the focus_area for that slug) or a chapter of
// it (returns the parent focus_area). Null when the POV has no
// journey home (meta / safety / advanced medical / cross-cutting).
export function parentFocusAreaForPovSlug(
  slug: string,
): FocusAreaSlug | null {
  const anchored = POV_SLUG_TO_FOCUS_AREA[slug];
  if (anchored) return anchored;
  return POV_PARENT_FOCUS_AREA[slug] ?? null;
}

// Whether a POV is the canonical anchor for a journey (its own
// focus_area maps back to it). Used by /system to render the strong
// "Journey" badge for anchors vs. the subtler "Part of: <Journey>"
// chip for chapters.
export function isJourneyAnchor(slug: string): boolean {
  return slug in POV_SLUG_TO_FOCUS_AREA;
}
