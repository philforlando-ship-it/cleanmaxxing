// User-facing copy for each milestone trigger. Authored Mister
// P-voice strings.
//
// Voice posture (locked from H1/H2 framing decision):
// - No cohort comparison. EVER.
// - No "Achievement unlocked" / confetti / emoji.
// - No streak count celebrations ("7 days in a row!").
// - Lean on Option A (self-comparison) for outcome milestones,
//   Option C (process-anchored) for behavioral milestones.
// - Keep titles short and dry. Bodies one to two sentences.

import { categoryForTriggerKey } from './types';

export type MilestoneCopy = {
  title: string;
  body: string;
  // Optional cross-link to a journey or surface most relevant to the
  // milestone. Used by wardrobe_reeval_due to point at /plan/style;
  // most milestones don't need one (the body copy stands alone).
  cta?: { href: string; label: string };
};

const STATIC_COPY: Record<string, MilestoneCopy> = {
  protein_floor_autopilot: {
    title: 'Protein floor — autopilot is built.',
    body: 'You hit your floor 12 of the last 14 days. That\'s the threshold where consistent protein stops being something you have to think about and starts being how you eat.',
  },
  strength_consistency_8_weeks: {
    title: 'Eight weeks consistent.',
    body: 'Eight weeks straight with at least two strength sessions each. The volume is what produces the adaptation — the show-up is the work.',
  },
  hair_stage_4_completed: {
    title: 'Hair Stage 4 — done.',
    body: 'You hit the daily-routine target. Stage 5 unlocks from here — quarterly photo monitoring, less hands-on, lower-frequency.',
  },
  nutrition_plan_three_months_old: {
    title: 'Three months on your nutrition plan.',
    body: 'Body composition changes show up over months, not weeks. Three months in is the window where the plan starts to compound — keep the floor, give it time, come back when something shifts.',
  },
  strength_plan_three_months_old: {
    title: 'Three months on your strength plan.',
    body: 'Three months is the window where consistency starts to lock in adaptation. Strength gains are downstream of show-up rate; you\'ve been showing up.',
  },
  body_fat_below_25: {
    title: 'Body fat — under 25%.',
    body: 'Self-estimate moved into the under-25% bracket. The visual difference between this and where you started is the kind of change that compounds with the next few percent.',
  },
  body_fat_below_20: {
    title: 'Body fat — under 20%.',
    body: 'Under 20% is the bracket where definition starts becoming visible without flexing. The work to get from here to under 15% is the same work, just compounded — keep doing what got you here.',
  },
  body_fat_below_15: {
    title: 'Body fat — under 15%.',
    body: 'Under 15% is the bracket where the underlying structure shows reliably. Going below this is harder per pound and rarely the right tradeoff for general health — worth deciding whether you\'re chasing a contest peak or holding here.',
  },
  body_fat_below_12: {
    title: 'Body fat — under 12%.',
    body: 'Under 12% is competition / photo-shoot range. It costs more to maintain than to reach. Most people hold here for a window, then settle 3-5 points higher for sustainable life.',
  },
  weight_5lb_below_start: {
    title: 'Five pounds below where you started.',
    body: 'Five pounds is the threshold where the change is real, not water. The plan is producing movement — the next move is keeping the protein floor and the training cadence so the loss is fat, not muscle.',
  },
  sleep_consistency_4_weeks: {
    title: 'Four weeks of consistent sleep.',
    body: 'Standard deviation under an hour over the last four weeks. That stability — going to bed and waking at consistent times — is the highest-ROI sleep variable in the framework. The hours are downstream of the rhythm.',
  },
  wardrobe_reeval_due: {
    title: 'Your body has shifted — your wardrobe probably hasn\'t.',
    body: 'You\'re 5% off where you started. Whether you lost fat or added muscle, your fits are reading differently now than they did in the mirror three months ago. Worth a tailoring pass on what you wear most — sleeves, waist, shoulders — and an honest look at what\'s in regular rotation.',
    cta: { href: '/plan/style', label: 'Open style plan →' },
  },
  rhr_trained_band_entered: {
    title: 'Resting heart rate — in the trained band.',
    body: 'Your 14-day rolling resting HR has dropped below 60. That\'s the aerobic engine getting more efficient — heart pushing more blood per beat, so it can beat fewer times for the same work. The Zone 2 base is paying out in the place it\'s supposed to.',
  },
  vo2_max_improving: {
    title: 'VO2max — measurably improving.',
    body: 'Your latest VO2max is more than 5% above where it was three months ago. That\'s a real cardiovascular adaptation — bigger stroke volume, better oxygen delivery — not normal-day variability. The aerobic base you\'ve been building is reading in the lab.',
  },
  // Phase-transition graduation milestones. Voice: POV 54 — the work
  // shifts; defended floor; drift is expected; not a finish line. No
  // confetti, no streak count.
  hair_maintenance_reached: {
    title: 'Hair — the work shifts now.',
    body: 'You hit Stage 4 and held it for a month. Your routine is built. The job shifts from building density to defending what you have — drift is expected, the climb back is small.',
    cta: { href: '/plan/hair', label: 'Open hair plan →' },
  },
  style_maintenance_reached: {
    title: 'Style — the closet is assembled.',
    body: 'Stage 3 closed out a month ago and the system is holding. Foundation pieces are in fit, archetype is coherent, color is anchored. Maintenance is its own outcome — a quarterly closet edit is most of the work from here.',
    cta: { href: '/plan/style', label: 'Open style plan →' },
  },
  body_composition_maintenance_reached: {
    title: 'Body composition — you\'re holding the range.',
    body: 'Eight weeks within your defended weight band. The work shifts from cutting / building to staying — same sessions, same protein, same sleep, lower attention cost. The floor is yours.',
  },
  strength_maintenance_reached: {
    title: 'Strength — twelve weeks of consistency.',
    body: 'Three months of holding the cadence at the level the plan asked for. This isn\'t a plateau, it\'s the platform. The work compounds quietly from here.',
    cta: { href: '/plan/strength', label: 'Open strength plan →' },
  },
  cardio_maintenance_reached: {
    title: 'Cardio — the engine is built.',
    body: 'Three months of consistent cadence on the prescribed modalities. The aerobic floor is set. What remains is holding it — the adaptation compounds quietly.',
    cta: { href: '/plan/cardio', label: 'Open cardio plan →' },
  },
  sleep_maintenance_reached: {
    title: 'Sleep — the rhythm is stable.',
    body: 'Four weeks of consistent timing. The hours are downstream of the rhythm and the rhythm is locked in. Defend the window; the rest follows.',
    cta: { href: '/plan/sleep', label: 'Open sleep plan →' },
  },
  skincare_maintenance_reached: {
    title: 'Skincare — the routine is set.',
    body: 'Two months on the routine without a meaningful change. Your skin has the inputs it needs. The work now is consistency, not complexity.',
    cta: { href: '/plan/skincare', label: 'Open skincare plan →' },
  },
  facial_hair_maintenance_reached: {
    title: 'Facial hair — the cadence holds.',
    body: 'Target length reached and the upkeep cadence is consistent. The shape is yours now. Drift is a week of skipped trims, not a regression.',
    cta: { href: '/plan/facial-hair', label: 'Open facial-hair plan →' },
  },
  facial_structure_maintenance_reached: {
    title: 'Facial structure — the framing floor is held.',
    body: 'Body comp, posture, sleep, framing — the levers that produced the definition are holding. Monthly photo is the cadence; the work shifts from building to defending.',
    cta: { href: '/plan/facial-structure', label: 'Open facial-structure plan →' },
  },
};

const GLP1_THREE_MONTHS_COPY: MilestoneCopy = {
  title: 'Three months on the GLP-1 protocol.',
  body: 'You\'re in the window where the medication is doing its work. The next three months are when habit infrastructure either holds or doesn\'t — protein floor, training cadence, hunger tolerance. Spend this stretch building.',
};

const PEPTIDE_THREE_MONTHS_COPY: MilestoneCopy = {
  title: 'Three months on the peptide protocol.',
  body: 'Peptide adaptations show up on the months timeline, not weeks. You\'re past the window where most users quit too early — sleep depth, recovery, and body-comp downstream effects are where the signal lives. Keep the cadence; the next three months are where the read gets clear.',
};

// Returns copy for any trigger key. Falls back to a generic
// placeholder for unknown keys (shouldn't happen — but a missing
// copy entry shouldn't crash the surface).
export function copyForTriggerKey(triggerKey: string): MilestoneCopy {
  const category = categoryForTriggerKey(triggerKey);
  if (category === 'glp1_three_months_on_protocol') {
    return GLP1_THREE_MONTHS_COPY;
  }
  if (category === 'peptide_three_months_on_protocol') {
    return PEPTIDE_THREE_MONTHS_COPY;
  }
  if (category === 'unknown') {
    return {
      title: 'Milestone reached.',
      body: 'A milestone fired but the copy is missing — file a bug.',
    };
  }
  return STATIC_COPY[category];
}
