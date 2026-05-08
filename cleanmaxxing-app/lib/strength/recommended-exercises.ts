// Recommends a subset of the strength exercise catalog based on the
// user's assessment answers. Pure function — no I/O. The exercise
// picker UI default-renders the recommended subset; a "Show all"
// toggle reveals filteredOut exercises dimmed (informational, not
// blocking — the user can still pick any of them).
//
// Filter order:
//   1. Equipment hard filter — equipment_access maps to which
//      Equipment categories appear at all
//   2. Injury hard filter — per-injury exclusion lists
//   3. Priority muscle up-rank — exercises with primary_muscles
//      overlapping priority_muscles get pinned to the top of their
//      group
//   4. Secondary objective up-rank — core_strength pins core; etc.
//
// Same per-injury exclusion lists as the report-prompt's T1 rules.
// Lifting them here lets the picker honor the constraints visually
// without going through Mister P.

import {
  STRENGTH_EXERCISES,
  type Equipment,
  type StrengthBodyweightPreference,
  type StrengthEquipmentAccess,
  type StrengthExercise,
  type StrengthInjuryConstraint,
  type StrengthPriorityMuscle,
  type StrengthSecondaryObjective,
} from './types';
import {
  DEFAULT_OWNED_BY_ACCESS,
  gearForExercise,
  isValidGearItem,
  type GearItem,
} from './gear';

const EQUIPMENT_VISIBILITY: Record<
  StrengthEquipmentAccess,
  Equipment[]
> = {
  full_commercial_gym: [
    'barbell',
    'dumbbell',
    'cable',
    'machine',
    'bodyweight',
    'weighted_bodyweight',
    'ez_bar',
    'smith',
    'kettlebell',
  ],
  home_rack_bench: [
    'barbell',
    'dumbbell',
    'bodyweight',
    'weighted_bodyweight',
    'ez_bar',
    'kettlebell',
  ],
  minimal_dumbbells: ['dumbbell', 'bodyweight'],
  bodyweight_only: ['bodyweight'],
};

// Per-injury exercise exclusion lists. Mirrors the same rules in
// lib/strength/report-prompt.ts (the report's T1 injury-constraint
// section). Kept in sync by hand for now — extract to a shared
// module if a third consumer appears.
const INJURY_EXCLUDES: Record<StrengthInjuryConstraint, string[]> = {
  lower_back_pain: [
    'deadlift',
    'good_morning',
    'deficit_barbell_bent_over_row',
    'romanian_deadlift',
    'stiff_leg_deadlift',
    'barbell_row',
    // 2026-05-07 catalog expansion exclusions
    'single_leg_dumbbell_rdl', // hinge with load
    'barbell_shrug', // heavy spinal compression
    'smith_squat', // back-loaded squat
    'jump_squat', // spinal impact
    'dumbbell_side_bend', // direct lateral flexion under load
    'hanging_windshield_wiper', // heavy oblique + lumbar load
    // Notable NON-exclusions: barbell_hip_thrust + cable_pull_through
    // are actually low-back-friendly (hip-dominant, neutral spine);
    // suitcase_carry is anti-lateral-flexion and often therapeutic.
  ],
  knee_pain: [
    'barbell_back_squat',
    'high_bar_squat',
    'hack_squat',
    'belt_squat',
    'dumbbell_reverse_lunge',
    'split_squat',
    'heel_elevated_bw_squat',
    'front_foot_elevated_smith_lunge',
    // 2026-05-07 catalog expansion exclusions
    'leg_press',
    'leg_extension', // terminal-extension is the canonical patellar-pain trigger
    'bulgarian_split_squat',
    'dumbbell_goblet_squat',
    'bodyweight_squat',
    'pistol_squat', // very high single-leg knee flexion under load
    'smith_squat',
    'jump_squat',
    'wall_sit', // sustained 90° knee flexion
    'bodyweight_split_squat',
  ],
  shoulder_or_neck_pain: [
    'standing_overhead_barbell_press',
    'super_rom_lateral_raise',
    // 2026-05-07 catalog expansion exclusions
    'seated_dumbbell_shoulder_press',
    'machine_shoulder_press',
    'dumbbell_pullover', // heavy shoulder mobility demand
    'weighted_pull_up',
    'weighted_chin_up',
    'chin_up', // full hang stresses irritated shoulders
  ],
  elbow_pain: [
    'barbell_skull_crusher',
    'ez_bar_behind_neck_tricep_extension',
    'preacher_curl',
    // 2026-05-07 catalog expansion exclusions
    'triceps_pushdown_rope',
    'overhead_triceps_extension_dumbbell',
    'standing_dumbbell_curl',
    'barbell_curl',
    'hammer_curl_dumbbell',
    'chin_up', // bicep loading at the elbow
    'weighted_chin_up',
    'weighted_pull_up',
    'dumbbell_pullover', // long-head tricep + elbow
  ],
};

export type RecommendedExercisesArgs = {
  equipment_access: StrengthEquipmentAccess;
  injury_constraints: StrengthInjuryConstraint[];
  priority_muscles: StrengthPriorityMuscle[];
  secondary_objective: StrengthSecondaryObjective | null;
  bodyweight_preference: StrengthBodyweightPreference | null;
  // Optional fine-grained gear list. When provided, exercises whose
  // required gear isn't in this set are dropped (catches the case
  // where an exercise tagged equipment='bodyweight' actually needs a
  // pull-up bar — e.g. bodyweight_row, hanging_leg_raise). When null
  // / undefined we fall back to DEFAULT_OWNED_BY_ACCESS so the
  // coarse equipment_access tier still does the right thing.
  equipment_owned?: string[] | null;
};

export type RecommendedExercisesResult = {
  // Exercises that pass equipment + injury filters AND fit the user's
  // profile. Sorted by up-rank score (priority muscles, secondary
  // objective).
  recommended: StrengthExercise[];
  // Exercises that PASS the equipment filter but are excluded by
  // an active injury constraint OR don't fit the user's profile
  // strongly. Surfaced under "Show all" with a dim treatment.
  filteredOut: StrengthExercise[];
  // Exercises that don't pass the equipment filter at all (e.g.
  // barbell exercises for a bodyweight-only user). Not surfaced
  // even in the expanded view — irrelevant to this user.
  hiddenByEquipment: StrengthExercise[];
};

// Mapping from priority_muscle slug to the muscle keywords that
// appear in StrengthExercise.primary_muscles. Loose match — case-
// insensitive substring on each muscle word.
const PRIORITY_MUSCLE_KEYWORDS: Record<StrengthPriorityMuscle, string[]> = {
  side_delts: ['side delt', 'lateral delt'],
  upper_chest: ['upper chest'],
  lats_back_width: ['lats'],
  arms: ['biceps', 'triceps', 'brachialis'],
  glutes: ['glutes'],
  hamstrings: ['hamstrings'],
  calves: ['calves', 'gastrocnemius', 'soleus'],
  // 'traps' matches both 'Traps' and 'Upper Traps' substrings.
  // Avoid 'upper back' here — too many rows mention it secondarily.
  traps: ['traps'],
};

function exerciseMatchesPriority(
  exercise: StrengthExercise,
  priorityMuscles: StrengthPriorityMuscle[],
): boolean {
  if (priorityMuscles.length === 0) return false;
  const haystack = exercise.primary_muscles.join(' ').toLowerCase();
  return priorityMuscles.some((m) =>
    PRIORITY_MUSCLE_KEYWORDS[m].some((kw) => haystack.includes(kw)),
  );
}

// Slugs the secondary objective wants pinned. Returns the set of
// exercise slugs to up-rank for that objective. Empty for objectives
// where no specific exercises are favored.
function secondaryObjectivePinSlugs(
  obj: StrengthSecondaryObjective | null,
): Set<string> {
  if (obj === 'core_strength') {
    return new Set(['ab_wheel_rollout']);
  }
  if (obj === 'general_function') {
    // Unilateral + carry-style work pinned for daily-life capability.
    return new Set([
      'split_squat',
      'dumbbell_reverse_lunge',
      'front_foot_elevated_smith_lunge',
    ]);
  }
  return new Set();
}

export function getRecommendedExercises(
  args: RecommendedExercisesArgs,
  allExercises: ReadonlyArray<StrengthExercise> = STRENGTH_EXERCISES,
): RecommendedExercisesResult {
  const allowedEquipment = new Set(
    EQUIPMENT_VISIBILITY[args.equipment_access],
  );

  // Fine-grained gear feasibility set. Tier filter alone is too coarse
  // for bodyweight-tagged exercises that actually need a pull-up bar
  // (bodyweight_row, hanging_leg_raise, etc.). Use the user's explicit
  // equipment_owned when set, otherwise fall back to per-tier defaults.
  // 'exercise_mat' is treated as universally available — every tier
  // assumes a floor or mat.
  const ownedSource =
    args.equipment_owned ?? DEFAULT_OWNED_BY_ACCESS[args.equipment_access] ?? [];
  const availableGear = new Set<GearItem>(['exercise_mat']);
  for (const slug of ownedSource) {
    if (isValidGearItem(slug)) availableGear.add(slug);
  }

  // Build the per-injury exclusion set across all active constraints.
  const injuryExcludes = new Set<string>();
  for (const inj of args.injury_constraints) {
    for (const slug of INJURY_EXCLUDES[inj] ?? []) {
      injuryExcludes.add(slug);
    }
  }

  const pinSlugs = secondaryObjectivePinSlugs(args.secondary_objective);

  // Bodyweight preference: 'primary' pins BW exercises to the top of
  // recommendations; 'fallback_only' pushes them to the filteredOut
  // set so they only surface when the user expands the menu; 'mixed'
  // and null behave like the prior default (BW ranked equally).
  const bwPreference = args.bodyweight_preference ?? 'mixed';
  const isBodyweight = (ex: StrengthExercise): boolean =>
    ex.equipment === 'bodyweight' || ex.equipment === 'weighted_bodyweight';

  const hiddenByEquipment: StrengthExercise[] = [];
  const filteredOut: StrengthExercise[] = [];
  const recommended: Array<{ ex: StrengthExercise; rank: number }> = [];

  for (const ex of allExercises) {
    if (!allowedEquipment.has(ex.equipment)) {
      hiddenByEquipment.push(ex);
      continue;
    }
    // Gear feasibility: e.g. bodyweight_row passes the equipment-tier
    // filter (it's tagged equipment='bodyweight') but requires a
    // pull-up bar that bodyweight_only / minimal_dumbbells users don't
    // own by default. Same for chin-up, hanging_leg_raise, etc.
    const gear = gearForExercise(ex);
    const gearOk = gear.every((g) => availableGear.has(g));
    if (!gearOk) {
      hiddenByEquipment.push(ex);
      continue;
    }
    if (injuryExcludes.has(ex.slug)) {
      filteredOut.push(ex);
      continue;
    }
    // Fallback-only BW preference, but ONLY when the user has another
    // equipment tier available. A bodyweight_only user with
    // 'fallback_only' preference is a contradiction — honor the
    // equipment access constraint over the preference, otherwise
    // they'd see nothing. Same logic for minimal_dumbbells where
    // bodyweight is one of two available tiers.
    if (
      bwPreference === 'fallback_only' &&
      isBodyweight(ex) &&
      args.equipment_access !== 'bodyweight_only'
    ) {
      filteredOut.push(ex);
      continue;
    }
    // Ranking — higher rank = pinned closer to top of its group.
    let rank = 0;
    if (pinSlugs.has(ex.slug)) rank += 10;
    if (exerciseMatchesPriority(ex, args.priority_muscles)) rank += 5;
    // BW-primary preference pushes BW above non-BW within the
    // recommendation set. Tied with priority_muscle bonus so
    // priority-AND-BW lands at the very top.
    if (bwPreference === 'primary' && isBodyweight(ex)) rank += 7;
    recommended.push({ ex, rank });
  }

  // Sort recommended by rank descending, then by original catalog
  // order (stable sort) within rank ties.
  const indexById = new Map(allExercises.map((e, i) => [e.slug, i]));
  recommended.sort((a, b) => {
    if (a.rank !== b.rank) return b.rank - a.rank;
    return (indexById.get(a.ex.slug) ?? 0) - (indexById.get(b.ex.slug) ?? 0);
  });

  return {
    recommended: recommended.map((r) => r.ex),
    filteredOut,
    hiddenByEquipment,
  };
}
