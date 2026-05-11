// Density-filtered cut menu. Returns the cut families that work for a
// given density state. Used in two places:
//   1. Stage 1 prompt — constrains the LLM's pick to the filtered
//      list (was previously a soft "avoid X" hint that the model
//      could ignore).
//   2. Stage 1 card — surfaced under "Other cuts that work for your
//      density" so the user sees the curated subset, not the full
//      12-cut roster.
//
// The lists are intentionally tight — fewer cuts surfaced is the
// point. For thinning users, showing the full roster includes cuts
// that look great in the reference photos but produce the wrong
// result on actual thinning hair.

import type {
  BaldingPattern,
  BaldingSeverity,
  CutFamily,
  DensityState,
} from './types';

export const CUTS_FOR_DENSITY: Record<DensityState, ReadonlyArray<CutFamily>> = {
  // Full density — most options open. The 2026 modern roster
  // (slick_back_undercut, broccoli, wolf, mullet, textured fringe,
  // overgrown buzz) all work when there's actual density to carry
  // the look. Age filter narrows further by cohort.
  full: [
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
    'pompadour',
    'high_taper_crop',
    // Migration 0091 — both new families require density to carry.
    'bro_flow',
    'classic_sweep_back',
  ],

  // Mature hairline — hairline has receded to its natural adult
  // position but density is otherwise intact. Most cuts still work;
  // textured_quiff drops because the volume + lift draws attention to
  // the temple line. slick_back_undercut works (the undercut sides
  // don't expose the hairline more than slick_back already does).
  // wolf_cut + broccoli + mullet drop because their volume reads
  // youth-coded and the mature hairline already nudges the look
  // older. side_part_combover + textured_fringe added — both gentle
  // hairline-aware options.
  mature_hairline: [
    'textured_crop',
    'ivy_league',
    'mid_length_textured',
    'crew_cut',
    'buzz_cut',
    'slick_back',
    'slick_back_undercut',
    'curtains',
    'textured_fringe',
    'overgrown_buzz',
    'side_part_combover',
    'pompadour',
    'caesar',
    'high_taper_crop',
    // Migration 0091 — classic_sweep_back is the executive-flow
    // silhouette explicitly designed to carry mature hairline. bro_flow
    // works here too when the salt-and-pepper variant is in scope.
    'classic_sweep_back',
    'bro_flow',
  ],

  // Receding hairline — active recession. The balding-friendly cuts
  // become the primary options. Slick back and curtains drop (both
  // expose temples). Textured quiff drops (lift draws the eye to
  // recession). textured_fringe + side_part_combover added — both
  // mask early recession by anchoring visual weight forward / across.
  receding_hairline: [
    'caesar',
    'high_taper_crop',
    'textured_crop',
    'textured_fringe',
    'side_part_combover',
    'crew_cut',
    'ivy_league',
    'buzz_cut',
    'overgrown_buzz',
    'short_fade',
  ],

  // Crown thinning — the top of the hair is the problem. Cuts must
  // not rely on full crown coverage. Caesar, high_taper_crop, crew,
  // and buzz are the four that work without the crown carrying the
  // look. Textured_crop included because forward movement also masks
  // crown gaps. overgrown_buzz added (still buzz-territory, more
  // length doesn't expose the crown the way longer cuts would).
  crown_thinning: [
    'caesar',
    'high_taper_crop',
    'crew_cut',
    'buzz_cut',
    'overgrown_buzz',
    'short_fade',
    'textured_crop',
  ],

  // Diffuse thinning — overall density loss without a focal point.
  // The cuts that still work are the ones that don't rely on density
  // for their visual story. Caesar reads well because the fringe is
  // the focus, not density. Buzz and high_taper_crop reduce the
  // contrast that makes thinning visible. overgrown_buzz and
  // short_fade added for the same reason — both keep the top short
  // enough that diffuse thinning has nothing to hide behind.
  diffuse_thinning: [
    'caesar',
    'high_taper_crop',
    'crew_cut',
    'buzz_cut',
    'overgrown_buzz',
    'short_fade',
  ],

  // Advanced thinning — the user is at the decision point. The Pattern
  // D / transition framing in the personal report governs which
  // direction the user is heading; this menu spans both: the shortest
  // hair cuts for users staying with hair (high_taper_crop, crew_cut,
  // buzz_cut, short_fade), and the deliberate-bald paths
  // (bald_track / bald_fade / clean_shave) for transitioning.
  advanced_thinning: [
    'high_taper_crop',
    'crew_cut',
    'buzz_cut',
    'short_fade',
    'bald_track',
    'bald_fade',
    'clean_shave',
  ],

  // Shaved or buzzed — bald presentation. Three paths now: bald_track
  // (transitioning / buzz maintenance), bald_fade (deliberate shaved
  // with structure), clean_shave (smooth Bic'd commitment).
  shaved_or_buzzed: ['bald_track', 'bald_fade', 'clean_shave'],
};

// Migration 0099 — balding_pattern + balding_severity hard override.
// A user who self-rated density_state='mature_hairline' but flagged
// front_and_vertex + severity 4 has more loss than the density label
// suggests. Coverage strategies stop working when both zones are gone
// or thinning is diffuse and severe; force the allowed list down to
// the advanced_thinning set so volume-on-top cuts can't be picked
// even by a mis-calibrated LLM.
//
// Override only NARROWS, never widens — passing pattern='none' or
// severity=0 with density_state='advanced_thinning' still returns the
// advanced_thinning list. Both args are optional; null/undefined fall
// back to density-only filtering (existing behavior).
export function cutsForDensity(
  state: DensityState,
  pattern: BaldingPattern | null = null,
  severity: BaldingSeverity | null = null,
): ReadonlyArray<CutFamily> {
  if (
    severity !== null &&
    severity >= 3 &&
    (pattern === 'front_and_vertex' || pattern === 'diffuse')
  ) {
    return CUTS_FOR_DENSITY.advanced_thinning;
  }
  return CUTS_FOR_DENSITY[state];
}
