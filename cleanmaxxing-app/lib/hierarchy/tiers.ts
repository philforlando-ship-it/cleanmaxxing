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

// Map onboarding focus_areas → canonical POV slug. Used to highlight
// the user's active journeys inside the tier list. Not every journey
// has a one-to-one POV — body_composition is anchored on the physical
// foundation POV (rather than diet-macros) because that's the POV the
// journey-report prompt cites first; if the canonical anchor changes,
// update here.
export const FOCUS_AREA_TO_POV_SLUG: Record<string, string> = {
  hair: '08-head-hair-balding',
  style: '12-style-clothing',
  body_composition: '13-body-physical-foundation',
  strength: '19-strength-training',
  cardio: '23-cardio',
  sleep: '42-sleep',
  skincare: '07-skincare-antiaging',
  facial_hair: '09-facial-hair',
};

// Reverse lookup — given a POV slug, get the focus_area it represents
// (or null if the POV isn't journey-anchored). Used by the renderer to
// stamp the "your journey" highlight on rows that match.
const POV_SLUG_TO_FOCUS_AREA: Record<string, string> = Object.fromEntries(
  Object.entries(FOCUS_AREA_TO_POV_SLUG).map(([fa, slug]) => [slug, fa]),
);

export function focusAreaForPovSlug(slug: string): string | null {
  return POV_SLUG_TO_FOCUS_AREA[slug] ?? null;
}
