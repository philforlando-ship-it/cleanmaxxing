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

import type { CutFamily, DensityState } from './types';

export const CUTS_FOR_DENSITY: Record<DensityState, ReadonlyArray<CutFamily>> = {
  // Full density — most options open. textured_quiff included; volume
  // works when there's hair to support it.
  full: [
    'textured_crop',
    'ivy_league',
    'textured_quiff',
    'mid_length_textured',
    'crew_cut',
    'buzz_cut',
    'slick_back',
    'curtains',
    'high_taper_crop',
  ],

  // Mature hairline — hairline has receded to its natural adult
  // position but density is otherwise intact. Most cuts still work;
  // textured_quiff drops because the volume + lift draws attention to
  // the temple line.
  mature_hairline: [
    'textured_crop',
    'ivy_league',
    'mid_length_textured',
    'crew_cut',
    'buzz_cut',
    'slick_back',
    'curtains',
    'caesar',
    'high_taper_crop',
  ],

  // Receding hairline — active recession. The balding-friendly cuts
  // become the primary options. Slick back and curtains drop (both
  // expose temples). Textured quiff drops (lift draws the eye to
  // recession).
  receding_hairline: [
    'caesar',
    'high_taper_crop',
    'textured_crop',
    'crew_cut',
    'ivy_league',
    'buzz_cut',
  ],

  // Crown thinning — the top of the hair is the problem. Cuts must
  // not rely on full crown coverage. Caesar, high_taper_crop, crew,
  // and buzz are the four that work without the crown carrying the
  // look. Textured_crop included because forward movement also masks
  // crown gaps.
  crown_thinning: [
    'caesar',
    'high_taper_crop',
    'crew_cut',
    'buzz_cut',
    'textured_crop',
  ],

  // Diffuse thinning — overall density loss without a focal point.
  // The cuts that still work are the ones that don't rely on density
  // for their visual story. Caesar reads well because the fringe is
  // the focus, not density. Buzz and high_taper_crop reduce the
  // contrast that makes thinning visible.
  diffuse_thinning: ['caesar', 'high_taper_crop', 'crew_cut', 'buzz_cut'],

  // Advanced thinning — the user is at the decision point. The Pattern
  // D / transition framing in the personal report governs which
  // direction the user is heading; this menu spans both: the three
  // shortest hair cuts (high_taper_crop, crew_cut, buzz_cut) for users
  // staying with hair, and bald_track + clean_shave for transitioning.
  advanced_thinning: [
    'high_taper_crop',
    'crew_cut',
    'buzz_cut',
    'bald_track',
    'clean_shave',
  ],

  // Shaved or buzzed — bald presentation. Two paths only.
  shaved_or_buzzed: ['bald_track', 'clean_shave'],
};

export function cutsForDensity(state: DensityState): ReadonlyArray<CutFamily> {
  return CUTS_FOR_DENSITY[state];
}
