// Buying-list / equipment-owned ontology.
//
// equipment_access on the assessment is a coarse 4-tier signal
// (full_commercial_gym / home_rack_bench / minimal_dumbbells /
// bodyweight_only). That's enough for the catalog filter but too
// coarse for a buying list — "bodyweight" includes "pull-up bar"
// and "dip station" and "no equipment at all", and a buying list
// needs to distinguish those.
//
// This module is the finer-grained ontology. Each exercise resolves
// to a set of gear items via gearForExercise; the union across the
// user's selected (or recommended) exercises is the required-gear
// set. Subtracting equipment_owned gives the recommended-buy list.

import type { StrengthExercise } from './types';

// User-buyable / locatable gear. Granularity tuned to "what's a
// distinct purchase decision" — not every cable attachment needs
// its own slug; a barbell with plates is one purchase even though
// it's two physical items.
export type GearItem =
  | 'barbell_and_plates'
  | 'squat_rack'
  | 'adjustable_bench'
  | 'decline_bench'
  | 'dumbbells'
  | 'ez_bar'
  | 'pull_up_bar'
  | 'dip_station'
  | 'dip_belt'
  | 'ab_wheel'
  | 'resistance_bands'
  | 'exercise_mat'
  // Umbrella for cable / smith / specific machines (leg press, pec
  // deck, etc.). Surfaced when the user's plan includes machine /
  // cable / smith exercises — the recommendation is "you'll want
  // gym access" rather than itemizing every machine.
  | 'gym_access';

export const GEAR_ITEMS: ReadonlyArray<GearItem> = [
  'barbell_and_plates',
  'squat_rack',
  'adjustable_bench',
  'decline_bench',
  'dumbbells',
  'ez_bar',
  'pull_up_bar',
  'dip_station',
  'dip_belt',
  'ab_wheel',
  'resistance_bands',
  'exercise_mat',
  'gym_access',
];

const GEAR_ITEMS_SET: ReadonlySet<string> = new Set(GEAR_ITEMS);

export function isValidGearItem(slug: string): slug is GearItem {
  return GEAR_ITEMS_SET.has(slug);
}

export const GEAR_LABEL: Record<GearItem, string> = {
  barbell_and_plates: 'Barbell + plate set',
  squat_rack: 'Squat rack (or power cage)',
  adjustable_bench: 'Adjustable bench (flat / incline)',
  decline_bench: 'Decline bench',
  dumbbells: 'Dumbbells (adjustable or set)',
  ez_bar: 'EZ-curl bar',
  pull_up_bar: 'Pull-up bar (doorway or wall-mount)',
  dip_station: 'Dip station (or parallel bars)',
  dip_belt: 'Dip belt with chain',
  ab_wheel: 'Ab wheel',
  resistance_bands: 'Resistance bands',
  exercise_mat: 'Exercise / yoga mat',
  gym_access: 'Gym access (cable, machines, smith)',
};

export const GEAR_BLURB: Record<GearItem, string> = {
  barbell_and_plates:
    'The single most important piece for serious training at home. Get a 7-foot 45-lb Olympic bar and at least 200 lbs of plates to start.',
  squat_rack:
    'A power cage or half rack — enables heavy squats, bench, overhead press without a spotter. The biggest "I am committing to this" piece.',
  adjustable_bench:
    'Flat-to-incline range. A flat-only bench is a false economy; the incline angle is too useful for upper-chest work.',
  decline_bench:
    'Separate decline bench is rarely worth it as a standalone purchase — most users skip this and rely on flat + incline.',
  dumbbells:
    'Adjustable (e.g., PowerBlocks, Bowflex) save space; full sets are more durable but expensive. Get to at least 50 lbs/hand range.',
  ez_bar:
    'Curved bar for curls / skull crushers. Wrist-friendlier than a straight barbell. Cheap and worth having if doing direct arm work.',
  pull_up_bar:
    'Doorway bar is the cheapest option ($30-$60). Wall-mount is sturdier but requires drilling. Both work for pull-ups, chin-ups, hanging core work.',
  dip_station:
    'Parallel bars for dips. Standalone or attached to power cage. Required for any dip work — bench dips don\'t replicate the stimulus.',
  dip_belt:
    'Belt with chain to add weight to dips and pull-ups. Once bodyweight stops being a stimulus, this is the cheapest progression.',
  ab_wheel:
    '$15 piece of equipment. Surprisingly effective core trainer; the rollout works the entire anterior chain.',
  resistance_bands:
    'Cheap, packable, useful for warm-ups, finishers, and as cable substitutes for travel / minimal setups.',
  exercise_mat:
    'Floor work and lying exercises (planks, hip thrust, glute bridge, BW work) on hard floors gets old fast. $20-$40.',
  gym_access:
    'Membership, work-gym, or building gym. Required for cable, smith, and most machine work in this plan.',
};

// Default gear set by equipment-access tier. Used to seed the
// "owned" checkboxes on first render — user can refine. After the
// first save, the explicit set persists and these defaults stop
// applying.
export const DEFAULT_OWNED_BY_ACCESS: Record<string, GearItem[]> = {
  full_commercial_gym: [
    'barbell_and_plates',
    'squat_rack',
    'adjustable_bench',
    'decline_bench',
    'dumbbells',
    'ez_bar',
    'pull_up_bar',
    'dip_station',
    'dip_belt',
    'ab_wheel',
    'exercise_mat',
    'gym_access',
  ],
  home_rack_bench: [
    'barbell_and_plates',
    'squat_rack',
    'adjustable_bench',
    'dumbbells',
    'pull_up_bar',
    'exercise_mat',
  ],
  minimal_dumbbells: ['dumbbells', 'exercise_mat'],
  bodyweight_only: ['exercise_mat'],
};

// Per-exercise gear overrides for cases where equipment-tier alone
// can't tell. Most barbell exercises need rack + bench; deadlift
// family doesn't. Most dumbbell exercises need just dumbbells; press
// variants need a bench. Bodyweight exercises that need a bar / dip
// station are listed explicitly.
const GEAR_OVERRIDES: Record<string, GearItem[]> = {
  // Barbell — bench-press variants need rack + adjustable bench
  flat_barbell_bench_press: [
    'barbell_and_plates',
    'squat_rack',
    'adjustable_bench',
  ],
  incline_cambered_bar_bench_press: [
    'barbell_and_plates',
    'squat_rack',
    'adjustable_bench',
  ],
  incline_barbell_bench_press: [
    'barbell_and_plates',
    'squat_rack',
    'adjustable_bench',
  ],
  decline_barbell_bench_press: [
    'barbell_and_plates',
    'squat_rack',
    'decline_bench',
  ],
  // Barbell — squats / OHP need rack but not bench
  barbell_back_squat: ['barbell_and_plates', 'squat_rack'],
  high_bar_squat: ['barbell_and_plates', 'squat_rack'],
  standing_overhead_barbell_press: ['barbell_and_plates', 'squat_rack'],
  good_morning: ['barbell_and_plates', 'squat_rack'],
  // Barbell — pulled-from-floor + accessories: just bar + plates
  deadlift: ['barbell_and_plates'],
  romanian_deadlift: ['barbell_and_plates'],
  stiff_leg_deadlift: ['barbell_and_plates'],
  barbell_row: ['barbell_and_plates'],
  deficit_barbell_bent_over_row: ['barbell_and_plates'],
  barbell_curl: ['barbell_and_plates'],
  barbell_shrug: ['barbell_and_plates'],
  // Barbell — bench-only (no rack): skull crusher, hip thrust
  barbell_skull_crusher: ['barbell_and_plates', 'adjustable_bench'],
  barbell_hip_thrust: ['barbell_and_plates', 'adjustable_bench'],

  // Dumbbell — press / lying variants need bench
  flat_dumbbell_bench_press: ['dumbbells', 'adjustable_bench'],
  incline_dumbbell_press: ['dumbbells', 'adjustable_bench'],
  decline_dumbbell_press: ['dumbbells', 'decline_bench'],
  seated_incline_dumbbell_curl: ['dumbbells', 'adjustable_bench'],
  lying_dumbbell_curl: ['dumbbells', 'adjustable_bench'],
  dumbbell_pullover: ['dumbbells', 'adjustable_bench'],
  seated_dumbbell_shoulder_press: ['dumbbells', 'adjustable_bench'],
  single_arm_dumbbell_row: ['dumbbells', 'adjustable_bench'],

  // EZ-bar variants
  preacher_curl: ['ez_bar', 'adjustable_bench'],
  ez_bar_behind_neck_tricep_extension: ['ez_bar'],

  // Bodyweight that needs a pull-up bar
  overhand_pull_up: ['pull_up_bar'],
  chin_up: ['pull_up_bar'],
  hanging_leg_raise: ['pull_up_bar'],
  hanging_windshield_wiper: ['pull_up_bar'],
  bodyweight_row: ['pull_up_bar'],

  // Bodyweight that needs a dip station
  bodyweight_dip: ['dip_station'],

  // Bodyweight with ab wheel
  ab_wheel_rollout: ['ab_wheel', 'exercise_mat'],

  // Weighted bodyweight — pull-up family needs bar + belt
  weighted_pull_up: ['pull_up_bar', 'dip_belt'],
  weighted_chin_up: ['pull_up_bar', 'dip_belt'],
  weighted_hanging_knee_raise: ['pull_up_bar', 'dip_belt'],

  // Weighted bodyweight — dip family needs station + belt
  weighted_dip: ['dip_station', 'dip_belt'],
  weighted_decline_crunch: ['decline_bench'],
};

// Resolve the gear set for a single exercise. Override map first,
// then equipment-tier defaults.
export function gearForExercise(ex: StrengthExercise): GearItem[] {
  const override = GEAR_OVERRIDES[ex.slug];
  if (override) return override;

  switch (ex.equipment) {
    case 'barbell':
      // Default for un-overridden barbell — assume rack + bench.
      // Specific exercises that don't need either are in the
      // override map above.
      return ['barbell_and_plates', 'squat_rack', 'adjustable_bench'];
    case 'dumbbell':
      return ['dumbbells'];
    case 'ez_bar':
      return ['ez_bar'];
    case 'cable':
    case 'machine':
    case 'smith':
      return ['gym_access'];
    case 'bodyweight':
      // Default — push-ups, planks, BW squats, etc. Just need a
      // mat (or floor). Bar / dip / wheel-requiring BW are in the
      // override map above.
      return ['exercise_mat'];
    case 'weighted_bodyweight':
      // Default — assume bar + belt. Dip-belt-only variants are in
      // the override map.
      return ['pull_up_bar', 'dip_belt'];
  }
}

// Union of gear required by a list of exercises.
export function gearRequiredForExercises(
  exercises: ReadonlyArray<StrengthExercise>,
): GearItem[] {
  const set = new Set<GearItem>();
  for (const ex of exercises) {
    for (const g of gearForExercise(ex)) {
      set.add(g);
    }
  }
  // Stable order = the GEAR_ITEMS canonical order. Filter rather
  // than sort for stable output.
  return GEAR_ITEMS.filter((g) => set.has(g));
}
