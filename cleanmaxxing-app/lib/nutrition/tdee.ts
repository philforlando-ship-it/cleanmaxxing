// TDEE + macro target calculator. Uses Mifflin-St Jeor for BMR
// (modern standard, more accurate than Harris-Benedict for typical
// US/EU populations) and standard activity multipliers.
//
// Mifflin-St Jeor (men):
//   BMR = (10 × weight_kg) + (6.25 × height_cm) − (5 × age) + 5
//
// Activity multipliers (industry standard):
//   sedentary           → 1.2
//   lightly_active      → 1.375
//   moderately_active   → 1.55
//   very_active         → 1.725
//
// Goal adjustments (relative to TDEE):
//   lose_fat → −500 kcal/day (~1 lb/week)
//   recomp / maintain → 0
//   gain_muscle → +250 kcal/day (lean bulk)
//
// Protein floor matrix (T4 — May 2026 rebalance from the 0.8/1.0
// binary to per-cohort branching):
//   goal_baseline:
//     maintain / not_sure → 0.75 g/lb
//     recomp              → 0.85 g/lb
//     lose_fat            → 1.00 g/lb
//     gain_muscle         → 1.00 g/lb
//   modifier overrides (take MAX with goal_baseline):
//     GLP-1 active     → 1.10 g/lb
//     age >= 50        → 1.00 g/lb
//   ceiling: 1.20 g/lb
//
// Net effect: median user (maintain, no modifiers) drops from 0.8
// to 0.75 g/lb. Recomp users go up from 0.8 to 0.85. Gain-muscle
// users go up from 0.8 to 1.0. GLP-1 users go up from 1.0 to 1.1.
// Cutting + age 50+ stay at 1.0.
//
// Fat: ~0.35 g/lb body weight (≈25-30% of calories).
// Carbs: remaining calories ÷ 4.
//
// All outputs are nullable when inputs are missing — the report
// generator handles the "no targets, fall back to qualitative" path.

import type { GoalDirection } from './types';

const LB_TO_KG = 0.453592;
const IN_TO_CM = 2.54;

const ACTIVITY_MULTIPLIER: Record<string, number> = {
  sedentary: 1.2,
  lightly_active: 1.375,
  moderately_active: 1.55,
  very_active: 1.725,
};

// Onboarding doesn't ask about activity level directly, and many users
// never visit /profile to set it explicitly. Without inference the BMR
// calc would refuse to compute for a sizable fraction of users. The
// fallback ladder:
//   1. Explicit profile.activity_level — use as-is.
//   2. profile.daily_training_minutes — derive from training load.
//   3. Default to 'lightly_active' (the median honest value for a
//      sedentary modern man with occasional movement). Surfaced
//      transparently as 'default' so the UI can label the assumption.
//
// Returns the resolved activity level + the source so callers can
// surface the inference rather than silently lying.
export type ActivityLevelKey =
  | 'sedentary'
  | 'lightly_active'
  | 'moderately_active'
  | 'very_active';

export type ActivityLevelSource =
  | 'explicit'
  | 'inferred_from_training_minutes'
  | 'default';

export type EffectiveActivityLevel = {
  value: ActivityLevelKey;
  source: ActivityLevelSource;
};

export function effectiveActivityLevel(args: {
  explicit: string | null;
  daily_training_minutes: number | null;
}): EffectiveActivityLevel {
  if (args.explicit && args.explicit in ACTIVITY_MULTIPLIER) {
    return {
      value: args.explicit as ActivityLevelKey,
      source: 'explicit',
    };
  }
  const mins = args.daily_training_minutes;
  if (mins != null && Number.isFinite(mins)) {
    if (mins >= 60) {
      return { value: 'very_active', source: 'inferred_from_training_minutes' };
    }
    if (mins >= 30) {
      return {
        value: 'moderately_active',
        source: 'inferred_from_training_minutes',
      };
    }
    if (mins >= 15) {
      return {
        value: 'lightly_active',
        source: 'inferred_from_training_minutes',
      };
    }
    return { value: 'sedentary', source: 'inferred_from_training_minutes' };
  }
  return { value: 'lightly_active', source: 'default' };
}

const GOAL_ADJUSTMENT: Record<GoalDirection, number> = {
  lose_fat: -500,
  recomp: 0,
  maintain: 0,
  gain_muscle: 250,
  not_sure: 0,
};

export type NutritionTargets = {
  tdee_estimate: number | null;
  calorie_target: number | null;
  protein_target_g: number | null;
  carb_target_g: number | null;
  fat_target_g: number | null;
};

export function computeNutritionTargets(args: {
  weight_lbs: number | null;
  height_inches: number | null;
  age: number | null;
  activity_level: string | null;
  goal_direction: GoalDirection;
  current_interventions: string[];
}): NutritionTargets {
  const { weight_lbs, height_inches, age, activity_level, goal_direction } =
    args;

  // BMR / TDEE require all of weight, height, age, activity. Without
  // them, the qualitative report is the fallback.
  if (
    weight_lbs == null ||
    height_inches == null ||
    age == null ||
    activity_level == null ||
    !(activity_level in ACTIVITY_MULTIPLIER)
  ) {
    return {
      tdee_estimate: null,
      calorie_target: null,
      protein_target_g: null,
      carb_target_g: null,
      fat_target_g: null,
    };
  }

  const weight_kg = weight_lbs * LB_TO_KG;
  const height_cm = height_inches * IN_TO_CM;
  const bmr = 10 * weight_kg + 6.25 * height_cm - 5 * age + 5;
  const tdee = Math.round(bmr * ACTIVITY_MULTIPLIER[activity_level]!);
  const calorieTarget = Math.max(
    1200, // safety floor — don't prescribe sub-1200 even on aggressive cut
    Math.round(tdee + GOAL_ADJUSTMENT[goal_direction]),
  );

  const proteinPerLb = proteinFloorPerLb({
    goal_direction,
    age,
    current_interventions: args.current_interventions,
  });
  const proteinG = Math.round(weight_lbs * proteinPerLb);

  // Fat — 0.35 g/lb (≈25-30% of calories at typical intake levels).
  const fatG = Math.round(weight_lbs * 0.35);

  // Carbs — fill the remainder. Calories per gram: protein 4, carb 4,
  // fat 9. Floor at 50g/day so the macro split doesn't go absurd if
  // protein + fat already meet target.
  const proteinKcal = proteinG * 4;
  const fatKcal = fatG * 9;
  const carbKcal = Math.max(200, calorieTarget - proteinKcal - fatKcal);
  const carbG = Math.round(carbKcal / 4);

  return {
    tdee_estimate: tdee,
    calorie_target: calorieTarget,
    protein_target_g: proteinG,
    carb_target_g: carbG,
    fat_target_g: fatG,
  };
}

// Per-cohort protein floor calculation. Exported so the BMR
// calculator panel and any future surfaces share one source of truth.
//
// Returns g/lb of bodyweight. Multiply by weight_lbs for grams.
// max-based so users with multiple cohort signals (e.g. cutting on
// GLP-1 at age 55) land at the highest applicable floor, not summed.
export function proteinFloorPerLb(args: {
  goal_direction: GoalDirection;
  age: number | null;
  current_interventions: string[];
}): number {
  const goalBaseline: Record<GoalDirection, number> = {
    maintain: 0.75,
    not_sure: 0.75,
    recomp: 0.85,
    lose_fat: 1.0,
    gain_muscle: 1.0,
  };

  let floor = goalBaseline[args.goal_direction];
  if (args.current_interventions.includes('glp1')) {
    floor = Math.max(floor, 1.1);
  }
  if (args.age != null && args.age >= 50) {
    floor = Math.max(floor, 1.0);
  }

  // Defensive ceiling — no current path hits this, but caps any future
  // modifier stack so we never prescribe an absurd protein number.
  return Math.min(floor, 1.2);
}

// =====================
// BMR calculator panel helpers (T4 Phase 3)
// =====================

// What inputs are required to render the BMR calculator panel.
// activity_level is intentionally NOT in the required set because
// effectiveActivityLevel always resolves to a usable value (explicit,
// inferred from daily_training_minutes, or defaulted) — the panel
// surfaces the source so the assumption isn't silent.
export type BmrCalculatorInputs = {
  weight_lbs: number | null;
  height_inches: number | null;
  age: number | null;
  activity_level: string | null;
  daily_training_minutes: number | null;
  current_interventions: string[];
};

export type MissingInputName = 'weight_lbs' | 'height_inches' | 'age';

export type MissingInputResult = {
  bmr: null;
  tdee: null;
  per_goal: null;
  missing: MissingInputName[];
  activity_level_source: null;
};

export type CompleteCalcResult = {
  bmr: number;
  tdee: number;
  per_goal: Record<GoalsForPanel, NutritionTargets>;
  missing: [];
  activity_level: ActivityLevelKey;
  activity_level_source: ActivityLevelSource;
};

export type BmrCalculatorResult = MissingInputResult | CompleteCalcResult;

// The four goals shown side-by-side in the panel. 'not_sure' is
// excluded — it doesn't produce a meaningful target row.
export type GoalsForPanel = 'lose_fat' | 'maintain' | 'recomp' | 'gain_muscle';

const PANEL_GOALS: ReadonlyArray<GoalsForPanel> = [
  'lose_fat',
  'maintain',
  'recomp',
  'gain_muscle',
];

// One-shot calculator for the panel. When weight + height + age are
// present, runs computeNutritionTargets for each of the 4 panel goals
// and bundles BMR + TDEE alongside; activity_level is resolved via
// effectiveActivityLevel so the calc doesn't refuse for users who
// haven't set it explicitly. When weight/height/age are missing, returns
// the list so the UI can prompt for them.
export function computeBmrCalculator(
  inputs: BmrCalculatorInputs,
): BmrCalculatorResult {
  const missing: MissingInputName[] = [];
  if (inputs.weight_lbs == null) missing.push('weight_lbs');
  if (inputs.height_inches == null) missing.push('height_inches');
  if (inputs.age == null) missing.push('age');

  if (missing.length > 0) {
    return {
      bmr: null,
      tdee: null,
      per_goal: null,
      missing,
      activity_level_source: null,
    };
  }

  const activity = effectiveActivityLevel({
    explicit: inputs.activity_level,
    daily_training_minutes: inputs.daily_training_minutes,
  });

  const weight_kg = inputs.weight_lbs! * LB_TO_KG;
  const height_cm = inputs.height_inches! * IN_TO_CM;
  const bmr = Math.round(
    10 * weight_kg + 6.25 * height_cm - 5 * inputs.age! + 5,
  );
  const tdee = Math.round(bmr * ACTIVITY_MULTIPLIER[activity.value]!);

  const per_goal = {} as Record<GoalsForPanel, NutritionTargets>;
  for (const goal of PANEL_GOALS) {
    per_goal[goal] = computeNutritionTargets({
      weight_lbs: inputs.weight_lbs,
      height_inches: inputs.height_inches,
      age: inputs.age,
      activity_level: activity.value,
      goal_direction: goal,
      current_interventions: inputs.current_interventions,
    });
  }

  return {
    bmr,
    tdee,
    per_goal,
    missing: [],
    activity_level: activity.value,
    activity_level_source: activity.source,
  };
}

export const MISSING_INPUT_LABEL: Record<MissingInputName, string> = {
  weight_lbs: 'Weight',
  height_inches: 'Height',
  age: 'Age',
};
