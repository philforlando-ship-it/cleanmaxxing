// Ranks the cardio modalities for a user based on their
// equipment_access (multi), outdoor_access, time_per_session, and
// injury_constraints. Returns the top 3 with a per-modality
// rationale string. Pure function — no I/O.
//
// Surfaced in the /plan/cardio recommended-modalities panel below
// the report. Doesn't replace the modality_preference field; it's a
// visual recommendation. The user can still re-Edit to update their
// stated preference set.
//
// Migration 0090 (2026-05-08): equipment_access is now an array, and
// 'walking_hiking' was split into 'slow_walking' (recovery-paced) +
// 'brisk_walking_hiking' (Zone 2 paced). The scoring logic treats
// brisk-walking-hiking as the universal high-fit modality for lifters
// (it's the closest to Nippard's "8-10k steps + brisk walks does
// most of the work" prescription). Slow walking is recovery work
// only — surfaces only when time-per-session is short or the user
// is older + sedentary.

import type {
  CardioEquipmentAccess,
  CardioInjuryConstraint,
  CardioModalityPreference,
  CardioOutdoorAccess,
  CardioPrimaryRole,
  CardioTimePerSession,
} from './types';

export type RecommendedModalitiesArgs = {
  equipment_access: CardioEquipmentAccess[];
  outdoor_access: CardioOutdoorAccess | null;
  time_per_session: CardioTimePerSession | null;
  injury_constraints: CardioInjuryConstraint[];
  // Migration 0090 — primary_role is what cardio is FOR per the user.
  // Multi-select array. Drives small additive bias on top of the
  // equipment/injury/time constraints below — e.g.,
  // cardiovascular_health users see cycling/rowing/elliptical biased
  // up toward the VO2max-building modalities; conditioning_for_lifting
  // users see running biased down (eccentric footstrike interferes).
  // Weights are intentionally small (+/- 1-3) so they don't override
  // hard exclusions — only break ties between otherwise-comparable
  // modalities. Pre-migration assessments pass [] and no role-bias
  // fires; the equipment/injury/time logic alone still produces a
  // sensible top 3.
  primary_role: CardioPrimaryRole[];
};

export type RankedModality = {
  modality: CardioModalityPreference;
  label: string;
  rationale: string;
};

const ALL_MODALITIES: CardioModalityPreference[] = [
  'running_jogging',
  'cycling',
  'rowing',
  'slow_walking',
  'brisk_walking_hiking',
  'elliptical_stair_machine',
  'classes_group',
  'swimming',
  'hate_all_cardio',
];

const MODALITY_LABEL: Record<CardioModalityPreference, string> = {
  running_jogging: 'Running or jogging',
  cycling: 'Cycling (indoor or outdoor)',
  rowing: 'Rowing',
  slow_walking: 'Slow walking (recovery + steps)',
  brisk_walking_hiking: 'Brisk walking or hiking (Zone 2)',
  elliptical_stair_machine: 'Elliptical or stair machine (low-impact gym)',
  classes_group: 'Group classes (spin, rowing class, hiking groups)',
  swimming: 'Swimming',
  hate_all_cardio: 'Step count + brisk walking',
};

// Per-modality scoring against the user's situation. Higher score =
// stronger fit. Modalities are then sorted by score descending.
function scoreModality(
  modality: CardioModalityPreference,
  args: RecommendedModalitiesArgs,
): { score: number; rationale: string } {
  const inj = new Set(args.injury_constraints);
  const eq = new Set(args.equipment_access);
  const noEq = eq.size === 0;

  // Hard exclusions — modalities that don't fit the user's situation
  // are not surfaced at all (negative score).
  if (modality === 'running_jogging') {
    if (inj.has('knee_pain') || inj.has('hip_pain')) {
      return { score: -100, rationale: 'Excluded — high impact on joints.' };
    }
    const hasTreadmill = eq.has('home_treadmill') || eq.has('full_gym');
    const hasOutdoorRoute =
      eq.has('outdoor_only') ||
      args.outdoor_access === 'year_round' ||
      args.outdoor_access === 'seasonal';
    if (!hasTreadmill && !hasOutdoorRoute) {
      return { score: -100, rationale: 'Excluded — no treadmill or outdoor route.' };
    }
  }
  if (modality === 'rowing') {
    if (!eq.has('full_gym') && !eq.has('classes_studio')) {
      return { score: -100, rationale: 'Excluded — no rowing machine access.' };
    }
    if (inj.has('back_pain')) {
      return {
        score: -50,
        rationale: 'Possible — but back pain on file. Form-first, short sessions only.',
      };
    }
  }
  if (modality === 'cycling') {
    const hasBike =
      eq.has('home_bike') || eq.has('full_gym') || eq.has('classes_studio');
    const hasOutdoorRoute =
      eq.has('outdoor_only') ||
      args.outdoor_access === 'year_round' ||
      args.outdoor_access === 'seasonal';
    if (!hasBike && !hasOutdoorRoute) {
      return { score: -100, rationale: 'Excluded — no bike + no outdoor route.' };
    }
  }
  if (modality === 'swimming') {
    if (!eq.has('full_gym') && !eq.has('classes_studio')) {
      return { score: -100, rationale: 'Excluded — no pool access.' };
    }
  }
  if (modality === 'elliptical_stair_machine') {
    if (!eq.has('full_gym') && !eq.has('classes_studio')) {
      return {
        score: -100,
        rationale: 'Excluded — no gym access (machines aren’t in most homes).',
      };
    }
  }

  // Now positive ranking — stronger fits get higher scores.
  let score = 0;
  let rationale = '';

  switch (modality) {
    case 'brisk_walking_hiking':
      score += 9; // brisk walking is the universally compatible Zone 2 modality
      rationale =
        'Lowest friction Zone 2. Joint-friendly. Step count compounds. Nippard’s default for lifters.';
      break;
    case 'slow_walking':
      score += 4; // recovery work — useful but lower priority than brisk walking
      rationale =
        'Recovery + steps, not Zone 2. Pairs with hard lifting days. Doesn’t replace structured cardio.';
      break;
    case 'cycling':
      score += 6;
      rationale = eq.has('home_bike')
        ? 'You have a bike. Best at-home VO₂max stimulus available.'
        : 'Joint-friendly Zone 2. Pure-concentric — minimal interference with lifting.';
      break;
    case 'rowing':
      score += 5;
      rationale = 'Full-body, low-impact. Watch overlap with pull days.';
      break;
    case 'running_jogging':
      score += 4;
      rationale =
        'Time-efficient. Higher interference with lifting than walking or cycling — eccentric load every footstrike.';
      break;
    case 'swimming':
      score += 5;
      rationale = 'Joint-friendly full-body. Use perceived effort, not heart rate.';
      break;
    case 'elliptical_stair_machine':
      // Joint-friendly Zone 2 (elliptical) + high-RPE muscular endurance
      // (stair). Strong fit when the user has gym access — sits between
      // brisk walking and cycling on the interference-cost ladder.
      score += 6;
      rationale = inj.has('knee_pain')
        ? 'Top-3 knee-friendly option. Elliptical for steady Zone 2; stair for hard intervals when knees allow.'
        : 'Low-impact gym cardio. Elliptical for steady Zone 2; stair for hard intervals.';
      break;
    case 'classes_group':
      score += 4;
      rationale = 'Social retention helps consistency. Watch HIIT-flavored classes for recovery cost.';
      break;
    case 'hate_all_cardio':
      score += 3;
      rationale =
        '8,000–10,000 daily steps captures most of the metabolic benefit. No formal sessions required.';
      break;
  }

  // Bonus for matching equipment access perfectly.
  if (modality === 'running_jogging' && eq.has('home_treadmill')) {
    score += 3;
  }
  if (modality === 'cycling' && eq.has('home_bike')) {
    score += 4;
  }
  if (modality === 'swimming' && eq.has('classes_studio')) {
    score += 1;
  }
  // Knee-pain users: elliptical is the canonical aerobic answer.
  // Promote it ahead of brisk walking to ensure it ranks.
  if (modality === 'elliptical_stair_machine' && inj.has('knee_pain')) {
    score += 3;
  }
  // Hip-pain users also benefit — same low-impact rationale.
  if (modality === 'elliptical_stair_machine' && inj.has('hip_pain')) {
    score += 2;
  }
  // No-equipment users get walking elevated even higher.
  if (
    (modality === 'brisk_walking_hiking' || modality === 'slow_walking') &&
    (noEq || eq.has('none_minimal'))
  ) {
    score += 2;
  }

  // Time-per-session adjustments.
  if (
    (modality === 'brisk_walking_hiking' || modality === 'slow_walking') &&
    args.time_per_session === 'under_20min'
  ) {
    score += 2; // walking fits short windows well
  }
  if (
    modality !== 'hate_all_cardio' &&
    modality !== 'slow_walking' &&
    args.time_per_session === 'under_20min'
  ) {
    score -= 1; // most structured cardio needs 30+ min for full Zone 2 benefit
  }

  // Outdoor access bonus for outdoor-leaning modalities.
  if (
    (modality === 'brisk_walking_hiking' ||
      modality === 'slow_walking' ||
      modality === 'running_jogging' ||
      modality === 'cycling') &&
    args.outdoor_access === 'year_round'
  ) {
    score += 1;
  }

  // Primary-role bias (mig 0090). Small additive weights — the
  // equipment / injury / time constraints above are load-bearing;
  // role-bias is the tiebreak that points the user at the modalities
  // best suited to their stated cardio goal. Multiple roles compound
  // (e.g., cardiovascular_health + conditioning_for_lifting both
  // present → cycling gets both bumps).
  const role = new Set(args.primary_role);

  if (role.has('cardiovascular_health')) {
    // Bias toward modalities that build VO2max via interval-friendly
    // formats; bias away from slow walking which adds steps but no
    // cardiorespiratory ceiling.
    if (
      modality === 'cycling' ||
      modality === 'rowing' ||
      modality === 'running_jogging' ||
      modality === 'elliptical_stair_machine'
    ) {
      score += 2;
    }
    if (modality === 'slow_walking') score -= 2;
  }

  if (role.has('conditioning_for_lifting')) {
    // Bias toward low-interference modalities (pure-concentric or
    // joint-friendly); bias away from running (eccentric footstrike
    // load every step interferes with leg-day recovery — Nippard's
    // explicit guidance).
    if (
      modality === 'cycling' ||
      modality === 'brisk_walking_hiking' ||
      modality === 'swimming'
    ) {
      score += 1;
    }
    if (modality === 'running_jogging') score -= 1;
  }

  if (role.has('support_fat_loss')) {
    // Higher caloric burn per minute — running, rowing, group classes
    // tend to drive the most output in the same time window. Small
    // bump only; the eating side still does most of the work.
    if (
      modality === 'running_jogging' ||
      modality === 'rowing' ||
      modality === 'classes_group'
    ) {
      score += 1;
    }
  }

  if (role.has('general_movement')) {
    // The user wants to move more, no fitness-target framing. Walking
    // is the right shape — slow walking included, since the goal is
    // movement not VO2max. Don't penalize anything; just lift the
    // friction-free options.
    if (
      modality === 'brisk_walking_hiking' ||
      modality === 'slow_walking'
    ) {
      score += 1;
    }
  }

  // 'not_sure' deliberately produces no adjustment — let the
  // constraint-based logic alone produce the ranking.

  return { score, rationale };
}

export function getRecommendedModalities(
  args: RecommendedModalitiesArgs,
): RankedModality[] {
  const ranked = ALL_MODALITIES.map((modality) => {
    const { score, rationale } = scoreModality(modality, args);
    return { modality, label: MODALITY_LABEL[modality], score, rationale };
  })
    .filter((r) => r.score >= 0)
    .sort((a, b) => b.score - a.score);

  return ranked.slice(0, 3).map(({ modality, label, rationale }) => ({
    modality,
    label,
    rationale,
  }));
}
