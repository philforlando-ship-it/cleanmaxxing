// Safe-rate framework for weight-loss planning. Per-tier maximum
// weekly loss rate as a percentage of body weight, with overrides for
// strength training (lean-mass preservation) and GLP-1 (medication
// paces it, no pushback from us).
//
// Rates locked 2026-05-07 from Helms / McDonald / NEJM research +
// internal voice posture. See project_nutrition_weight_loss_goal
// memory note for the full discussion.

const LB_TO_KG = 0.453592;
const IN_TO_M = 0.0254;

export type SafeRateTier =
  | 'lean'
  | 'normal'
  | 'overweight'
  | 'obese'
  | 'maintain_only';

// Max weekly rate as fraction of body weight by tier.
const TIER_RATE: Record<SafeRateTier, number> = {
  lean: 0.005,
  normal: 0.01,
  overweight: 0.015,
  obese: 0.02,
  // Special return for users at or below BMI 22 — we don't recommend
  // active weight loss. The plan should pivot to maintain.
  maintain_only: 0,
};

export const STRENGTH_TRAINING_CAP = 0.01;

export function computeBmi(
  weightLbs: number,
  heightInches: number,
): number {
  const weightKg = weightLbs * LB_TO_KG;
  const heightM = heightInches * IN_TO_M;
  return weightKg / (heightM * heightM);
}

// Goal-weight floor: the weight at BMI 22 for the user's height.
// Anything below this gets rejected at the form level — no
// auto-extension into sub-floor territory.
export function bmi22FloorLbs(heightInches: number): number {
  const heightM = heightInches * IN_TO_M;
  const targetKg = 22 * heightM * heightM;
  return Math.round(targetKg / LB_TO_KG);
}

// Tier classification. BF% takes precedence when provided (more
// accurate for muscular users that BMI miscategorizes); falls back
// to BMI when not. BMI < 20 forces maintain_only regardless of BF%
// — a lean athlete in that band shouldn't be cutting at all.
export function classifyTier(args: {
  weightLbs: number;
  heightInches: number;
  bfPct: number | null;
}): SafeRateTier {
  const bmi = computeBmi(args.weightLbs, args.heightInches);
  if (bmi < 20) return 'maintain_only';
  if (args.bfPct != null) {
    if (args.bfPct <= 15) return 'lean';
    if (args.bfPct <= 25) return 'normal';
    if (args.bfPct <= 30) return 'overweight';
    return 'obese';
  }
  if (bmi < 22) return 'lean';
  if (bmi < 27) return 'normal';
  if (bmi < 32) return 'overweight';
  return 'obese';
}

// Effective max weekly rate after all overrides applied. Returned as
// a fraction of body weight (0.005 = 0.5%/week).
//
// Rules in priority order:
//   1. GLP-1 active → no cap from us (medication paces; return 0.025
//      as a sanity ceiling but the report-prompt knows not to push back)
//   2. Strength training → cap at 1.0%/week regardless of tier
//   3. Tier baseline
export function safeWeeklyRate(args: {
  tier: SafeRateTier;
  isStrengthTraining: boolean;
  isOnGlp1: boolean;
}): number {
  if (args.isOnGlp1) return 0.025;
  const tierBase = TIER_RATE[args.tier];
  if (args.isStrengthTraining && tierBase > STRENGTH_TRAINING_CAP) {
    return STRENGTH_TRAINING_CAP;
  }
  return tierBase;
}

export type GoalValidation =
  | { ok: true; floorLbs: number }
  | {
      ok: false;
      floorLbs: number;
      reason: 'below_bmi_22' | 'goal_above_current';
    };

// Validate goal weight against the BMI-22 hard floor. Returns the
// computed floor regardless so the form can surface it.
export function validateGoalWeight(args: {
  currentWeightLbs: number;
  goalWeightLbs: number;
  heightInches: number;
}): GoalValidation {
  const floorLbs = bmi22FloorLbs(args.heightInches);
  if (args.goalWeightLbs >= args.currentWeightLbs) {
    return { ok: false, floorLbs, reason: 'goal_above_current' };
  }
  if (args.goalWeightLbs < floorLbs) {
    return { ok: false, floorLbs, reason: 'below_bmi_22' };
  }
  return { ok: true, floorLbs };
}

export type TimelineResolution = {
  weeksRequested: number;
  realisticWeeks: number;
  wasExtended: boolean;
  weeksToLose: number;
  maxWeeklyLossLbs: number;
};

// Auto-extend timeline silently when requested rate exceeds cap.
// Returns the realistic timeline; the form persists weeksRequested
// (the user's intent) AND realisticWeeks (the snapshot) so the report
// can name the extension when it happened.
export function resolveTimeline(args: {
  currentWeightLbs: number;
  goalWeightLbs: number;
  weeksRequested: number;
  safeWeeklyRatePct: number;
}): TimelineResolution {
  const weightToLose = Math.max(0, args.currentWeightLbs - args.goalWeightLbs);
  const maxWeeklyLossLbs = args.currentWeightLbs * args.safeWeeklyRatePct;
  if (maxWeeklyLossLbs <= 0) {
    return {
      weeksRequested: args.weeksRequested,
      realisticWeeks: args.weeksRequested,
      wasExtended: false,
      weeksToLose: weightToLose,
      maxWeeklyLossLbs: 0,
    };
  }
  const minWeeksAtCap = Math.ceil(weightToLose / maxWeeklyLossLbs);
  const realisticWeeks = Math.max(args.weeksRequested, minWeeksAtCap);
  return {
    weeksRequested: args.weeksRequested,
    realisticWeeks,
    wasExtended: realisticWeeks > args.weeksRequested,
    weeksToLose: weightToLose,
    maxWeeklyLossLbs,
  };
}
