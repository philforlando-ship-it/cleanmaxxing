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
// Macro split:
//   Protein: 0.8 g/lb body weight (1.0 g/lb if cutting or 50+ or
//     on GLP-1)
//   Fat: ~0.35 g/lb body weight (≈25-30% of calories)
//   Carbs: remaining calories ÷ 4
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

  // Protein floor — bumped for cuts, age 50+, or GLP-1 (muscle
  // preservation conditions).
  const isOnGlp1 = args.current_interventions.includes('glp1');
  const isCutting = goal_direction === 'lose_fat';
  const isOlder = age >= 50;
  const proteinPerLb = isOnGlp1 || isCutting || isOlder ? 1.0 : 0.8;
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
