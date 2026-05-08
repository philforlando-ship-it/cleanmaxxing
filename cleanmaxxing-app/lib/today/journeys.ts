// Journey grid config for /today.
//
// All 8 journeys always surface on /today (they're not gated by
// focus_areas anymore). focus_areas dictates the *order* — picked
// journeys come first, with the Cleanmaxxing pyramid tier breaking
// ties in each group.
//
// Tier mapping comes from each journey's anchor POV's priority_tier
// (see lib/hierarchy/tiers.ts and content/povs/_metadata.json).
// Anchor POVs are taken from FOCUS_AREA_TO_POV_SLUG.

import type { TierKey } from '@/lib/hierarchy/tiers';

// Journey slug = the focus_area key from the onboarding picker.
// body_composition is the focus area that points at the nutrition
// plan surface (there's no /plan/body_composition page; the physical
// foundation work is consolidated under nutrition + strength +
// cardio, with nutrition the closest single-plan home).
export type JourneySlug =
  | 'hair'
  | 'style'
  | 'body_composition'
  | 'strength'
  | 'cardio'
  | 'sleep'
  | 'skincare'
  | 'facial_hair';

export type JourneyConfig = {
  slug: JourneySlug;
  label: string;
  // Path to the plan surface. body_composition routes into the
  // nutrition plan; everything else is /plan/<slug>.
  planPath: string;
  // One-line description used as the secondary tile copy when the
  // user hasn't started the plan yet.
  blurb: string;
  // Cleanmaxxing pyramid tier — breaks ties between picked vs
  // unpicked groups.
  tier: TierKey;
};

export const JOURNEYS: ReadonlyArray<JourneyConfig> = [
  {
    slug: 'hair',
    label: 'Hair',
    planPath: '/plan/hair',
    blurb: 'Cut, density, treatment options, photo tracking.',
    tier: 'tier-1',
  },
  {
    slug: 'body_composition',
    label: 'Body composition',
    planPath: '/plan/nutrition',
    blurb: 'Nutrition plan — protein, calories, eating pattern.',
    tier: 'tier-1',
  },
  {
    slug: 'sleep',
    label: 'Sleep',
    planPath: '/plan/sleep',
    blurb: 'Schedule, blockers, commitments to act on tonight.',
    tier: 'tier-1',
  },
  {
    slug: 'skincare',
    label: 'Skincare',
    planPath: '/plan/skincare',
    blurb: 'Routine baseline, sun protection, retinoid timing.',
    tier: 'tier-1',
  },
  {
    slug: 'style',
    label: 'Style',
    planPath: '/plan/style',
    blurb: 'Closet audit, foundation pieces, fit calibration.',
    tier: 'tier-2',
  },
  {
    slug: 'strength',
    label: 'Strength',
    planPath: '/plan/strength',
    blurb: 'Lifting plan, equipment, priority muscles, autoregulation.',
    tier: 'tier-2',
  },
  {
    slug: 'cardio',
    label: 'Cardio',
    planPath: '/plan/cardio',
    blurb: 'Modality, dose, integration with the rest of the system.',
    tier: 'tier-3',
  },
  {
    slug: 'facial_hair',
    label: 'Facial hair',
    planPath: '/plan/facial-hair',
    blurb: 'Density-aware style picks and grow-out plan.',
    tier: 'tier-3',
  },
];

// Tier rank for sorting (lower = higher priority).
const TIER_RANK: Record<TierKey, number> = {
  'tier-1': 1,
  'tier-2': 2,
  'tier-3': 3,
  'tier-4': 4,
  'tier-5': 5,
};

// Maps legacy focus_area vocabulary (pre-2026-05-07 picker) onto the
// current journey slugs. fitness expanded into strength + cardio; skin
// became skincare; grooming became facial_hair. Body composition was
// already canonical. Returns the canonical slug for each legacy value
// (with fitness emitting BOTH strength and cardio).
function expandLegacyFocusArea(value: string): JourneySlug[] {
  switch (value) {
    case 'hair':
    case 'style':
    case 'body_composition':
    case 'strength':
    case 'cardio':
    case 'sleep':
    case 'skincare':
    case 'facial_hair':
      return [value];
    case 'fitness':
      return ['strength', 'cardio'];
    case 'skin':
      return ['skincare'];
    case 'grooming':
      return ['facial_hair'];
    default:
      return [];
  }
}

// Sort the journey list by (picked first, then tier, then catalog
// order). Pure function — pass in the user's focus_areas array and
// receive a stable, deterministic ordering.
export function sortJourneys(
  focusAreas: ReadonlyArray<string>,
): JourneyConfig[] {
  const pickedSet = new Set<JourneySlug>(
    focusAreas.flatMap(expandLegacyFocusArea),
  );
  const catalogIndex = new Map<JourneySlug, number>(
    JOURNEYS.map((j, i) => [j.slug, i]),
  );

  return [...JOURNEYS].sort((a, b) => {
    const aPicked = pickedSet.has(a.slug);
    const bPicked = pickedSet.has(b.slug);
    if (aPicked !== bPicked) return aPicked ? -1 : 1;
    if (TIER_RANK[a.tier] !== TIER_RANK[b.tier]) {
      return TIER_RANK[a.tier] - TIER_RANK[b.tier];
    }
    return (catalogIndex.get(a.slug) ?? 0) - (catalogIndex.get(b.slug) ?? 0);
  });
}

// Status the journey tile renders. Driven by assessment-existence +
// report-existence rollups already gathered by the primary-action
// picker, so no extra DB calls. Three states:
//   none      — no assessment yet, CTA is "Start"
//   in_progress — assessment exists but report didn't generate (or
//                 the user is mid-flow); CTA is "Resume"
//   ready     — report present, plan exists; CTA is "Open"
export type JourneyStatus = 'none' | 'in_progress' | 'ready';

export function statusFromAssessment(
  hasAssessment: boolean,
  hasReport: boolean,
): JourneyStatus {
  if (hasReport) return 'ready';
  if (hasAssessment) return 'in_progress';
  return 'none';
}

export const STATUS_LABEL: Record<JourneyStatus, string> = {
  none: 'No plan yet',
  in_progress: 'Plan generation incomplete',
  ready: 'Plan ready',
};

export const STATUS_CTA: Record<JourneyStatus, string> = {
  none: 'Start',
  in_progress: 'Resume',
  ready: 'Open',
};
