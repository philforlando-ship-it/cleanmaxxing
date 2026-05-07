// Age-cohort cut filter. Pairs with cut-by-density.ts — the final
// menu surfaced to the user is the intersection: density-appropriate
// ∩ age-appropriate. Without this, a 42-year-old with full density
// sees broccoli/wolf/mullet alongside slick-back, which fights the
// product's voice (these are youth-coded silhouettes that read
// poorly on older men).
//
// Three bands keyed on users.age:
//   18-29 — full youth set + all standards. broccoli, wolf, mullet
//           all in scope.
//   30-40 — youth-coded gone. modern_mullet stays at the upper edge
//           because it's the milder of the youth set. broccoli +
//           wolf drop.
//   41+   — also drops modern_mullet, mid_length_textured (visually
//           youthful), curtains (model-ish). textured_quiff stays —
//           short quiff is on the user's "best 35+" list per their
//           research. slick_back_undercut stays (the user's research
//           explicitly notes 25-50).
//
// When age is null (user skipped /profile age, or pre-existing
// account before age was required), default to ALL cuts — the
// density filter alone is the gate. Better to over-include than to
// silently hide cuts on missing data.

import type { CutFamily } from './types';

export type AgeBand = 'young' | 'middle' | 'mature';

export function ageToBand(age: number | null): AgeBand | null {
  if (age == null) return null;
  if (age <= 29) return 'young';
  if (age <= 40) return 'middle';
  return 'mature';
}

// Cuts that DON'T appear in each band. Shape inverted from
// CUTS_FOR_DENSITY because most cuts are universal across age — it's
// the youth-coded and stuffy-mature edges that get gated. Listing
// exclusions reads more honestly than reciting the universal set.
const AGE_EXCLUSIONS: Record<AgeBand, ReadonlyArray<CutFamily>> = {
  young: [
    // Side-part combover reads decades older than 18-29 should look —
    // even on early recession, a 22-year-old should see caesar /
    // high_taper_crop / buzz instead.
    'side_part_combover',
  ],
  middle: [
    'broccoli',
    'wolf_cut',
    // side_part_combover is in scope here — mid-30s is the cohort
    // that benefits from it for early recession.
  ],
  mature: [
    'broccoli',
    'wolf_cut',
    'modern_mullet',
    'mid_length_textured',
    'curtains',
  ],
};

export function cutsForAge(
  age: number | null,
  candidates: ReadonlyArray<CutFamily>,
): ReadonlyArray<CutFamily> {
  const band = ageToBand(age);
  if (band == null) return candidates;
  const excluded = new Set(AGE_EXCLUSIONS[band]);
  return candidates.filter((c) => !excluded.has(c));
}
