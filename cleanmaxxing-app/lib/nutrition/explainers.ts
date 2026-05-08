// "Why this number?" explainers for the daily-targets card on /plan/nutrition.
//
// Each helper returns a short list of human-readable lines that walk
// the user through how the number was derived from THEIR inputs. No
// black-box recommendations — the user can see the math.
//
// Pure functions; no DB access. Inputs come from the assessment row +
// the profile snapshot already loaded by the page. Returns null when
// inputs are insufficient (e.g. weight/height/age missing) so the
// page can suppress the explainer rather than rendering "?? × ??".
//
// Voice posture: same as the rest of the app — direct, dry, no
// moralizing. "Your weight × 0.85 g/lb (recomp baseline) = 174g"
// reads like a coach showing their work, not a robot reciting.

import type { GoalDirection } from './types';
import type { TrainingExperience } from '@/lib/profile/service';

const LB_TO_KG = 0.45359237;
const IN_TO_CM = 2.54;

// Activity multiplier labels for the explainer — must mirror tdee.ts.
const ACTIVITY_LABEL: Record<string, string> = {
  sedentary: 'sedentary (×1.2)',
  lightly_active: 'lightly active (×1.375)',
  moderately_active: 'moderately active (×1.55)',
  very_active: 'very active (×1.725)',
};

const ACTIVITY_MULTIPLIER: Record<string, number> = {
  sedentary: 1.2,
  lightly_active: 1.375,
  moderately_active: 1.55,
  very_active: 1.725,
};

function fmtNum(n: number, decimals = 0): string {
  return n.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

// =====================
// TDEE explainer
// =====================

export type TdeeExplainerInputs = {
  weight_lbs: number | null;
  height_inches: number | null;
  age: number | null;
  activity_level: string | null;
  tdee_estimate: number | null;
};

export function explainTdee(args: TdeeExplainerInputs): string[] | null {
  if (
    args.weight_lbs == null ||
    args.height_inches == null ||
    args.age == null ||
    args.activity_level == null ||
    args.tdee_estimate == null
  ) {
    return null;
  }
  const weightKg = args.weight_lbs * LB_TO_KG;
  const heightCm = args.height_inches * IN_TO_CM;
  const bmr = Math.round(10 * weightKg + 6.25 * heightCm - 5 * args.age + 5);
  const activityKey = args.activity_level;
  const activityLabel =
    ACTIVITY_LABEL[activityKey] ?? `${activityKey} (multiplier unknown)`;
  return [
    `BMR (Mifflin-St Jeor): 10 × ${fmtNum(weightKg, 1)} kg + 6.25 × ${fmtNum(heightCm, 0)} cm − 5 × ${args.age} + 5 = ${fmtNum(bmr)} kcal/day at rest`,
    `Activity multiplier: ${activityLabel}`,
    `TDEE = ${fmtNum(bmr)} × ${ACTIVITY_MULTIPLIER[activityKey] ?? '?'} = ${fmtNum(args.tdee_estimate)} kcal/day`,
  ];
}

// =====================
// Calorie target explainer
// =====================

export type CalorieExplainerInputs = {
  goal_direction: GoalDirection;
  training_experience: TrainingExperience | null;
  tdee_estimate: number | null;
  calorie_target: number | null;
  // When present, the calorie target came from the safe-rate-capped
  // weight-loss plan, not the flat -500 default. The explainer should
  // surface the safe-rate cap and any auto-extended timeline.
  safe_max_weekly_pct: number | null;
  realistic_target_weeks: number | null;
};

const GOAL_LABEL: Record<GoalDirection, string> = {
  lose_fat: 'lose fat',
  recomp: 'recomp (same weight, less fat, more muscle)',
  gain_muscle: 'gain muscle',
  maintain: 'maintain',
  not_sure: 'not sure',
};

export function explainCalories(args: CalorieExplainerInputs): string[] | null {
  if (args.tdee_estimate == null || args.calorie_target == null) return null;

  const lines: string[] = [
    `Goal: ${GOAL_LABEL[args.goal_direction]}.`,
    `TDEE estimate: ${fmtNum(args.tdee_estimate)} kcal/day.`,
  ];

  // Weight-loss-plan path: targets came from the safe-rate-capped
  // calculator, not the flat -500. Surface the cap + any timeline
  // auto-extension.
  if (
    args.goal_direction === 'lose_fat' &&
    args.safe_max_weekly_pct != null &&
    args.realistic_target_weeks != null
  ) {
    const deficit = args.tdee_estimate - args.calorie_target;
    lines.push(
      `Daily deficit: ${fmtNum(args.tdee_estimate)} − ${fmtNum(args.calorie_target)} = ${fmtNum(deficit)} kcal/day.`,
      `Safe-rate cap: ${args.safe_max_weekly_pct}% body weight per week (capped by your starting body fat / BMI tier). The deficit you see is set so the projected loss stays at or below this cap.`,
      `Realistic timeline at this pace: ~${args.realistic_target_weeks} weeks.`,
    );
    return lines;
  }

  // Static-goal path: compute the static adjustment that was applied.
  let adjustment: number;
  let adjustmentReason: string;
  if (args.goal_direction === 'lose_fat') {
    adjustment = -500;
    adjustmentReason = 'fat-loss default (~1 lb/week)';
  } else if (args.goal_direction === 'gain_muscle') {
    adjustment = 250;
    adjustmentReason = 'lean-bulk default';
  } else if (args.goal_direction === 'recomp') {
    const exp = args.training_experience;
    if (exp === '1_to_3y' || exp === '3_to_10y' || exp === 'over_10y') {
      adjustment = -200;
      adjustmentReason =
        'lean recomp — past 1y of structured lifting, the slight deficit prioritizes the fat side while protein + lifting hold muscle';
    } else {
      adjustment = 0;
      adjustmentReason =
        'beginner / returning recomp — eat at TDEE, ride newbie or muscle-memory gains';
    }
  } else {
    adjustment = 0;
    adjustmentReason = 'maintain — no adjustment';
  }

  const adjustmentSign = adjustment >= 0 ? '+' : '−';
  lines.push(
    `Goal adjustment: ${adjustmentSign}${fmtNum(Math.abs(adjustment))} kcal — ${adjustmentReason}.`,
    `Calorie target = ${fmtNum(args.tdee_estimate)} ${adjustmentSign} ${fmtNum(Math.abs(adjustment))} = ${fmtNum(args.calorie_target)} kcal/day.`,
  );

  // Note the safety floor when it bit (calorie_target is at the floor
  // and would otherwise be lower).
  if (args.calorie_target === 1200 && args.tdee_estimate + adjustment < 1200) {
    lines.push(
      `Safety floor applied: we don't prescribe sub-1,200 kcal/day even when the math would compute lower.`,
    );
  }

  return lines;
}

// =====================
// Protein explainer
// =====================

export type ProteinExplainerInputs = {
  goal_direction: GoalDirection;
  weight_lbs: number | null;
  age: number | null;
  current_interventions: string[];
  protein_target_g: number | null;
};

export function explainProtein(args: ProteinExplainerInputs): string[] | null {
  if (
    args.weight_lbs == null ||
    args.protein_target_g == null
  ) {
    return null;
  }

  // Mirror the floor matrix in tdee.ts (proteinFloorPerLb).
  let baseline: number;
  let baselineReason: string;
  if (args.goal_direction === 'maintain' || args.goal_direction === 'not_sure') {
    baseline = 0.75;
    baselineReason = 'maintain baseline (0.75 g/lb)';
  } else if (args.goal_direction === 'recomp') {
    baseline = 0.85;
    baselineReason = 'recomp baseline (0.85 g/lb)';
  } else {
    baseline = 1.0;
    baselineReason = `${args.goal_direction === 'lose_fat' ? 'cut' : 'gain-muscle'} baseline (1.0 g/lb)`;
  }

  const overrides: { perLb: number; reason: string }[] = [];
  if (args.current_interventions.includes('glp1')) {
    overrides.push({
      perLb: 1.1,
      reason: 'GLP-1 active — total intake drops, so protein density per gram has to come up (1.1 g/lb)',
    });
  }
  if (args.age != null && args.age >= 50) {
    overrides.push({
      perLb: 1.0,
      reason: 'age 50+ — anabolic resistance compensation (1.0 g/lb)',
    });
  }

  const final = overrides.reduce(
    (acc, o) => Math.max(acc, o.perLb),
    baseline,
  );
  const ceiling = Math.min(final, 1.2);

  const lines: string[] = [
    `Baseline: ${baselineReason}.`,
  ];
  for (const o of overrides) {
    lines.push(`Modifier: ${o.reason}.`);
  }
  if (ceiling < final) {
    lines.push(`Ceiling cap: 1.2 g/lb (no diminishing returns past this).`);
  }
  lines.push(
    `Per-pound floor used: ${fmtNum(ceiling, 2)} g/lb.`,
    `Protein target = ${fmtNum(args.weight_lbs, 0)} lbs × ${fmtNum(ceiling, 2)} = ${fmtNum(args.protein_target_g)} g/day.`,
  );

  return lines;
}

// =====================
// Fat explainer
// =====================

export type FatExplainerInputs = {
  weight_lbs: number | null;
  fat_target_g: number | null;
};

export function explainFat(args: FatExplainerInputs): string[] | null {
  if (args.weight_lbs == null || args.fat_target_g == null) return null;
  return [
    `Fat: ~0.35 g per lb of body weight (≈25-30% of total calories — the standard hormonal-health floor).`,
    `Fat target = ${fmtNum(args.weight_lbs, 0)} lbs × 0.35 = ${fmtNum(args.fat_target_g)} g/day.`,
  ];
}

// =====================
// Carb explainer
// =====================

export type CarbExplainerInputs = {
  calorie_target: number | null;
  protein_target_g: number | null;
  fat_target_g: number | null;
  carb_target_g: number | null;
};

export function explainCarbs(args: CarbExplainerInputs): string[] | null {
  if (
    args.calorie_target == null ||
    args.protein_target_g == null ||
    args.fat_target_g == null ||
    args.carb_target_g == null
  ) {
    return null;
  }
  const proteinKcal = args.protein_target_g * 4;
  const fatKcal = args.fat_target_g * 9;
  const carbKcal = args.calorie_target - proteinKcal - fatKcal;
  return [
    `Protein supplies ${fmtNum(proteinKcal)} kcal (${args.protein_target_g}g × 4).`,
    `Fat supplies ${fmtNum(fatKcal)} kcal (${args.fat_target_g}g × 9).`,
    `Remaining calories for carbs: ${fmtNum(args.calorie_target)} − ${fmtNum(proteinKcal)} − ${fmtNum(fatKcal)} = ${fmtNum(carbKcal)} kcal.`,
    `Carb target = ${fmtNum(carbKcal)} ÷ 4 = ${fmtNum(args.carb_target_g)} g/day.`,
  ];
}
