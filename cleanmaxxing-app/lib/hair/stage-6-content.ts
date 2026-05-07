// Stage 6 content — maintenance + revisit triggers (terminal stage).
//
// Authored Mister P-voice copy. Stage 6 is "thin — mostly settings"
// per the framework memo. The journey enters perpetual maintenance
// after this; /today goes quiet on hair unless a check-in is overdue
// or a modifier event fires.

import type { CutFamily } from './types';

export const STAGE_6_INTRO = `You've worked through the plan. Stage 6 is the quiet stage — the rules of when to revisit, what cadence holds the cut sharp, and when to pull the whole plan back open for a re-assessment. Most weeks, hair shouldn't be on your mind. The right structure is the structure you can mostly ignore.`;

export const STAGE_6_REVISIT_TRIGGERS = [
  'Density changes — visible recession or thinning that wasn\'t there last time you took photos. Pull up Edit Answers on /plan/hair and rerun the assessment.',
  'A big lifestyle shift — major weight change, new medication, sustained high-stress period, postpartum if it applies. Hair responds to all of these and the right plan can shift with you.',
  'You hit Stage 4\'s gate and the daily routine has settled into auto-pilot. Annual re-assessment is sensible regardless — set a calendar reminder.',
  'Stage 5 photo comparison shows a clear change you can\'t explain. Don\'t guess; rerun the plan.',
];

// Cadence weeks per cut family. These are barber-norm guidelines, not
// laws — a textured crop on someone with fast-growing hair might want
// 3 weeks, slow growth might stretch to 7. Stored as a default on the
// row at Stage 6 start; the user can ignore it if they have their own
// rhythm with a barber.
export function computeCutCadenceWeeks(cutFamily: CutFamily): number {
  switch (cutFamily) {
    case 'clean_shave':
      // Daily-to-every-other-day razor maintenance. Rounded to 1 week
      // for the schema's weeks column; the cadenceLabel call below
      // names the actual daily reality so users don't think "weekly."
      return 1;
    case 'buzz_cut':
    case 'bald_track':
      // Really 3-10 days for a tight buzz / shave; rounded to 2 weeks
      // for the column constraint (column is in weeks). The card copy
      // names the daily reality.
      return 2;
    case 'high_taper_crop':
    case 'slick_back_undercut':
    case 'broccoli':
    case 'bald_fade':
    case 'pompadour':
      // Skin-fade / undercut lines blur quickly; broccoli shape
      // collapses fast as the curly volume grows out unevenly;
      // bald_fade depends entirely on the fade transition staying
      // sharp; pompadour height + fade combo is high-maintenance.
      return 4;
    case 'overgrown_buzz':
      // Faster than buzz_cut because the longer top is the
      // load-bearing part and grows out of shape sooner.
      return 3;
    case 'short_fade':
      // Short top + fade — fade lines blur fast but the very-short
      // top means the overall silhouette holds. Same cadence as buzz.
      return 2;
    case 'caesar':
    case 'textured_crop':
    case 'textured_fringe':
    case 'crew_cut':
    case 'ivy_league':
    case 'slick_back':
    case 'textured_quiff':
    case 'modern_mullet':
    case 'side_part_combover':
      return 5;
    case 'mid_length_textured':
    case 'curtains':
    case 'wolf_cut':
      // Wolf is shaggy by design — holds its shape longer because the
      // intended look IS the grown-out feel. Same cadence as curtains.
      return 7;
  }
}

// Human-readable cadence string for the card copy. Bald-presentation
// cuts are special cases — "every 1-2 weeks" undersells the actual
// maintenance rhythm of a razor or buzz.
export function cadenceLabel(
  cutFamily: CutFamily | null,
  weeks: number,
): string {
  if (cutFamily === 'clean_shave') {
    return 'Every 1–2 days for the smooth result. Skip a few days and the stubble shows; this isn’t a weekly cut, it’s a daily-or-every-other-day routine. Treat the schedule as habit, not appointment.';
  }
  if (cutFamily === 'buzz_cut' || cutFamily === 'bald_track') {
    return 'Every 3–10 days, depending on your shave length and how fast it shows. Treat the schedule as habit, not appointment.';
  }
  if (weeks <= 4) return `Every ${weeks} weeks. Don't let it drift past — the cut\'s shape collapses fast.`;
  if (weeks <= 6) return `Every ${weeks} weeks. Standard barber cadence.`;
  return `Every ${weeks} weeks. Longer cuts hold their shape further out, but not indefinitely.`;
}
