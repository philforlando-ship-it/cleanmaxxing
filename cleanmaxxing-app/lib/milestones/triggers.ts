// Pure detector functions for the milestone trigger system. Each
// returns whether the trigger should fire given some gathered
// state. No I/O. The orchestrator in lib/milestones/detect.ts
// handles the data fetch and the once-per-(user, trigger_key)
// guarantee.
//
// Voice posture reminder: NONE of these detectors compare against
// other users or population norms. Every milestone is anchored to
// the user's own behavior or state — Option A (self-comparison)
// or Option C (process-anchored).

const DAYS_MS = 24 * 60 * 60 * 1000;

// =====================
// Behavioral (logging-dependent)
// =====================

// 12+ days hit-the-floor over the last 14 days of nutrition_logs.
// Both fields come from getRecentProteinSignal — window_days is
// the lookback window (14), logged_days is days the user logged
// (≤ 14), hit_days is the subset where they cleared the floor.
export function detectProteinFloorAutopilot(args: {
  window_days: number;
  hit_days: number;
  logged_days: number;
}): boolean {
  // Require both: the user has logged enough days to have a real
  // signal AND a strong majority of those logged days hit the
  // floor. 12/14 (~85%) reads as "the autopilot is built" without
  // requiring perfection.
  return (
    args.window_days >= 14 &&
    args.logged_days >= 12 &&
    args.hit_days >= 12
  );
}

// 8 consecutive ISO weeks with at least 2 strength workouts each.
// `weeklyCounts` is oldest-first; index 0 is 8 weeks ago, index 7
// is the most recent fully-elapsed week. The current week is NOT
// included — partial weeks would let users earn the milestone
// before they've actually held the cadence.
export function detectStrengthConsistency8Weeks(
  weeklyCounts: number[],
): boolean {
  if (weeklyCounts.length < 8) return false;
  const lastEight = weeklyCounts.slice(-8);
  return lastEight.every((c) => c >= 2);
}

// =====================
// Calendar / passive
// =====================

// 90+ days on a GLP-1 protocol without going off. Caller is
// responsible for filtering the interventions list to GLP-1 rows
// in 'on_protocol' or 'paused' state — we just check the days
// elapsed. 'paused' counts because the user hasn't quit the
// protocol; they're just temporarily off (cycling, side effects,
// supply gap).
export function detectGlp1ThreeMonths(args: {
  started_at: string | null;
  status: string;
  now: number;
}): boolean {
  if (!args.started_at) return false;
  if (args.status !== 'on_protocol' && args.status !== 'paused') {
    return false;
  }
  const startMs = new Date(args.started_at).getTime();
  if (Number.isNaN(startMs)) return false;
  return args.now - startMs >= 90 * DAYS_MS;
}

// =====================
// State / passive
// =====================

// Hair Stage 4 ramp completion — fires once when the
// hair_assessments.stage_4_completed_at timestamp gets set.
export function detectHairStage4Completed(args: {
  stage_4_completed_at: string | null;
}): boolean {
  return args.stage_4_completed_at !== null;
}

// Nutrition or strength plan-anniversary triggers. Both follow the
// same shape — fires when the assessment row's created_at is at
// least 90 days old. Uses created_at rather than
// last_evaluated_at because we want to celebrate "stuck with the
// plan for three months" not "re-evaluated three months ago."
export function detectPlanThreeMonthsOld(args: {
  assessment_created_at: string | null;
  now: number;
}): boolean {
  if (!args.assessment_created_at) return false;
  const createdMs = new Date(args.assessment_created_at).getTime();
  if (Number.isNaN(createdMs)) return false;
  return args.now - createdMs >= 90 * DAYS_MS;
}

// =====================
// Tier 2: body composition / weight / sleep consistency
// =====================

// Body-fat brackets. The user's self-estimate is categorical —
// 'under_12' / '12_to_15' / '15_to_20' / '20_to_25' / 'over_25'.
// Each below-N trigger fires when the estimate first enters that
// bracket (lower or equal to the boundary). The unique index keeps
// it once-per-user; if the estimate later goes back up, the row
// stays put — the user reached this bracket once, that's worth
// recognizing once. The four brackets are independent because a
// user starting at 22% will earn below_25 first, then below_20
// later, etc. — each is its own moment.
export function detectBodyFatBelow(args: {
  bf_pct_self_estimate: string | null;
  threshold: 25 | 20 | 15 | 12;
}): boolean {
  if (!args.bf_pct_self_estimate) return false;
  // Categorical → numeric ceiling for the bracket. 'under_12' means
  // the user is somewhere below 12, so it satisfies every threshold.
  // '12_to_15' has a ceiling of 15, satisfies <= 15 thresholds. Etc.
  const ceiling: Record<string, number> = {
    under_12: 11,
    '12_to_15': 15,
    '15_to_20': 20,
    '20_to_25': 25,
    over_25: 99,
  };
  const userCeiling = ceiling[args.bf_pct_self_estimate];
  if (userCeiling === undefined) return false;
  return userCeiling < args.threshold + 1; // strict-below semantics
}

// Weight 5+ lb below the snapshot at first nutrition assessment.
// Only fires when goal_direction is 'lose_fat' — going down 5lb on
// a bulk would be a regression, not a milestone, and going down
// 5lb on maintenance is too noisy to celebrate (water shifts,
// scale variance). The trigger is "the cut is producing visible
// movement."
export function detectWeight5lbBelowStart(args: {
  current_weight_lbs: number | null;
  start_weight_lbs: number | null;
  goal_direction: string | null;
}): boolean {
  if (args.goal_direction !== 'lose_fat') return false;
  if (args.current_weight_lbs == null || args.start_weight_lbs == null) {
    return false;
  }
  return args.start_weight_lbs - args.current_weight_lbs >= 5;
}

// Sleep consistency over 4 weeks. Requires ≥20 logged nights in
// the last 28 days AND nightly-hours std dev below 1.0. SD-based
// rather than target-based because POV 42 frames consistency
// itself as the highest-leverage move — "your schedule has
// stabilized" is more meaningful than "you hit 7h X times."
export function detectSleepConsistency4Weeks(args: {
  logged_hours_last_28: number[];
}): boolean {
  if (args.logged_hours_last_28.length < 20) return false;
  const n = args.logged_hours_last_28.length;
  const mean =
    args.logged_hours_last_28.reduce((a, b) => a + b, 0) / n;
  const variance =
    args.logged_hours_last_28.reduce(
      (acc, x) => acc + (x - mean) * (x - mean),
      0,
    ) / n;
  const sd = Math.sqrt(variance);
  return sd < 1.0;
}

// =====================
// Tier 2 deferred: resting heart rate trained-band entered
// =====================
// The "trained band" for adult men is conventionally 50-60 bpm —
// reflects established aerobic adaptation. The trigger should fire
// when a 14-day rolling RHR average drops below 60 for the first
// time (and the user wasn't there at baseline).
//
// Detector lives here so when wearable RHR data lands the
// orchestrator wiring is one fetch + one detector call. NOT yet
// active — daily_activity has steps only, sleep_logs has hours/quality
// only. When Vital starts persisting RHR (per the premium roadmap),
// add a `health_metrics` table with rolling RHR and wire this in.
export function detectRhrTrainedBandEntered(args: {
  rolling_avg_rhr_14d: number | null;
  baseline_rhr: number | null;
}): boolean {
  if (args.rolling_avg_rhr_14d == null) return false;
  if (args.baseline_rhr != null && args.baseline_rhr < 60) return false;
  return args.rolling_avg_rhr_14d < 60;
}
