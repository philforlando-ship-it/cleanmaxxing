// Detector orchestrator. Gathers the state each trigger needs in
// one parallel fetch, runs the pure detector functions, and
// inserts a milestone row for any that fire. Idempotent because
// of the unique (user_id, trigger_key) index — safe to call on
// every /today render.

import type { SupabaseClient } from '@supabase/supabase-js';
import { listInterventions } from '@/lib/interventions/service';
import { getRecentProteinSignal } from '@/lib/nutrition/service';
import { getUserProfile } from '@/lib/profile/service';
import {
  detectBodyFatBelow,
  detectGlp1ThreeMonths,
  detectHairStage4Completed,
  detectPlanThreeMonthsOld,
  detectProteinFloorAutopilot,
  detectRhrTrainedBandEntered,
  detectSleepConsistency4Weeks,
  detectStrengthConsistency8Weeks,
  detectVo2MaxImproving,
  detectWardrobeReevalDue,
  detectWeight5lbBelowStart,
} from './triggers';
import { recordMilestoneIfNew } from './service';
import { STATIC_TRIGGER_KEYS, glp1ThreeMonthsKey } from './types';
import { getRhrSignals, getVo2MaxSignal } from '@/lib/vital/wearable-signals';

const DAYS_MS = 24 * 60 * 60 * 1000;

// Group strength workout dates into ISO-week-aligned buckets,
// returning the counts oldest-first across the 8 most recent
// COMPLETED weeks (current week excluded). The trigger requires
// 8 elapsed weeks of cadence — partial weeks would let users earn
// the milestone before they've actually held it.
function groupStrengthByWeek(
  dates: string[],
  now: Date,
): number[] {
  // Find the start of the current ISO week (Monday). The 8 weeks
  // we care about are the 8 weeks BEFORE this one.
  const dayOfWeek = (now.getDay() + 6) % 7; // Mon=0 ... Sun=6
  const startOfThisWeek = new Date(now);
  startOfThisWeek.setHours(0, 0, 0, 0);
  startOfThisWeek.setDate(startOfThisWeek.getDate() - dayOfWeek);

  // Buckets[0] = 8 weeks ago, Buckets[7] = last completed week.
  const buckets = new Array(8).fill(0);
  for (const dateStr of dates) {
    const d = new Date(`${dateStr}T00:00:00Z`);
    if (Number.isNaN(d.getTime())) continue;
    if (d.getTime() >= startOfThisWeek.getTime()) continue; // current week — skip
    const weeksAgo = Math.floor(
      (startOfThisWeek.getTime() - d.getTime()) / (7 * DAYS_MS),
    );
    if (weeksAgo < 0 || weeksAgo >= 8) continue;
    buckets[7 - weeksAgo] += 1;
  }
  return buckets;
}

// `isPremium` gates the Pro-tier milestones (body-fat brackets, RHR
// trained-band, protocol anniversaries, VO2max progression). Free
// users get the behavioral / state milestones — protein-floor,
// strength-consistency, hair stage 4, weight 5lb below start, sleep
// consistency, wardrobe reeval — but not the wearable-derived or
// protocol-tenure ones, which is what the Pro pricing claims.
export async function detectAndRecordMilestones(
  supabase: SupabaseClient,
  userId: string,
  isPremium: boolean,
): Promise<void> {
  const now = Date.now();
  const eightWeeksAgo = new Date(now - 9 * 7 * DAYS_MS).toISOString().slice(0, 10);
  const fourWeeksAgo = new Date(now - 28 * DAYS_MS).toISOString().slice(0, 10);

  const [
    proteinSignal,
    interventions,
    { data: workoutRows },
    { data: hairRow },
    { data: nutritionRow },
    { data: strengthRow },
    profile,
    { data: sleepRows },
    rhrSignals,
    vo2MaxSignal,
  ] = await Promise.all([
    getRecentProteinSignal(supabase, userId),
    listInterventions(supabase, userId),
    supabase
      .from('workout_logs')
      .select('performed_on')
      .eq('user_id', userId)
      .eq('type', 'strength')
      .gte('performed_on', eightWeeksAgo),
    supabase
      .from('hair_assessments')
      .select('stage_4_completed_at')
      .eq('user_id', userId)
      .maybeSingle(),
    // Tier 2 weight-below-start needs the SNAPSHOT weight from the
    // first nutrition assessment + the current goal_direction. Pull
    // the row alongside created_at.
    supabase
      .from('nutrition_assessments')
      .select('created_at, goal_direction, report_input_modifiers')
      .eq('user_id', userId)
      .maybeSingle(),
    supabase
      .from('strength_assessments')
      .select('created_at')
      .eq('user_id', userId)
      .maybeSingle(),
    getUserProfile(supabase, userId),
    supabase
      .from('sleep_logs')
      .select('hours')
      .eq('user_id', userId)
      .gte('night_of', fourWeeksAgo),
    isPremium
      ? getRhrSignals(supabase, userId)
      : Promise.resolve({ rolling_avg_rhr_14d: null, baseline_rhr: null }),
    isPremium
      ? getVo2MaxSignal(supabase, userId)
      : Promise.resolve({ latest_value: null, latest_date: null, trend: null }),
  ]);

  // ===== Behavioral: protein floor autopilot =====
  if (
    detectProteinFloorAutopilot({
      window_days: proteinSignal.window_days,
      hit_days: proteinSignal.hit_days,
      logged_days: proteinSignal.logged_days,
    })
  ) {
    await recordMilestoneIfNew(
      supabase,
      userId,
      STATIC_TRIGGER_KEYS.PROTEIN_FLOOR_AUTOPILOT,
      {
        window_days: proteinSignal.window_days,
        hit_days: proteinSignal.hit_days,
        logged_days: proteinSignal.logged_days,
      },
    );
  }

  // ===== Behavioral: strength consistency 8 weeks =====
  const dates = ((workoutRows ?? []) as Array<{ performed_on: string }>).map(
    (r) => r.performed_on,
  );
  const weeklyCounts = groupStrengthByWeek(dates, new Date(now));
  if (detectStrengthConsistency8Weeks(weeklyCounts)) {
    await recordMilestoneIfNew(
      supabase,
      userId,
      STATIC_TRIGGER_KEYS.STRENGTH_CONSISTENCY_8_WEEKS,
      { weekly_counts: weeklyCounts },
    );
  }

  // ===== Calendar: GLP-1 three months on protocol — Pro =====
  // One milestone per intervention row — a user with two GLP-1
  // cycles (one ended, one current) gets two distinct trigger keys
  // when each crosses 90 days.
  if (isPremium) {
    for (const intervention of interventions) {
      if (intervention.type !== 'glp1') continue;
      if (
        detectGlp1ThreeMonths({
          started_at: intervention.started_at,
          status: intervention.status,
          now,
        })
      ) {
        await recordMilestoneIfNew(
          supabase,
          userId,
          glp1ThreeMonthsKey(intervention.id),
          {
            intervention_id: intervention.id,
            started_at: intervention.started_at,
            days_on_protocol: Math.floor(
              (now - new Date(intervention.started_at!).getTime()) / DAYS_MS,
            ),
          },
        );
      }
    }
  }

  // ===== State: hair Stage 4 completed =====
  const hairAssessment = hairRow as { stage_4_completed_at: string | null } | null;
  if (
    hairAssessment &&
    detectHairStage4Completed({
      stage_4_completed_at: hairAssessment.stage_4_completed_at,
    })
  ) {
    await recordMilestoneIfNew(
      supabase,
      userId,
      STATIC_TRIGGER_KEYS.HAIR_STAGE_4_COMPLETED,
      { completed_at: hairAssessment.stage_4_completed_at },
    );
  }

  // ===== Calendar: nutrition plan three months old — Pro =====
  const nutritionAssessment = nutritionRow as { created_at: string | null } | null;
  if (
    isPremium &&
    nutritionAssessment &&
    detectPlanThreeMonthsOld({
      assessment_created_at: nutritionAssessment.created_at,
      now,
    })
  ) {
    await recordMilestoneIfNew(
      supabase,
      userId,
      STATIC_TRIGGER_KEYS.NUTRITION_PLAN_THREE_MONTHS,
      { created_at: nutritionAssessment.created_at },
    );
  }

  // ===== Calendar: strength plan three months old — Pro =====
  const strengthAssessment = strengthRow as { created_at: string | null } | null;
  if (
    isPremium &&
    strengthAssessment &&
    detectPlanThreeMonthsOld({
      assessment_created_at: strengthAssessment.created_at,
      now,
    })
  ) {
    await recordMilestoneIfNew(
      supabase,
      userId,
      STATIC_TRIGGER_KEYS.STRENGTH_PLAN_THREE_MONTHS,
      { created_at: strengthAssessment.created_at },
    );
  }

  // ===== State: body fat brackets — Pro =====
  // Each below-N bracket fires once when self-estimate first enters
  // it; unique index keeps it once-per-user. Sequential thresholds
  // are checked together because a user dropping from over_25 to
  // under_12 in a single update should still earn each bracket they
  // crossed (one row per).
  const brackets: Array<{
    threshold: 25 | 20 | 15 | 12;
    key: string;
  }> = [
    { threshold: 25, key: STATIC_TRIGGER_KEYS.BODY_FAT_BELOW_25 },
    { threshold: 20, key: STATIC_TRIGGER_KEYS.BODY_FAT_BELOW_20 },
    { threshold: 15, key: STATIC_TRIGGER_KEYS.BODY_FAT_BELOW_15 },
    { threshold: 12, key: STATIC_TRIGGER_KEYS.BODY_FAT_BELOW_12 },
  ];
  if (isPremium) {
    for (const bracket of brackets) {
      if (
        detectBodyFatBelow({
          bf_pct_self_estimate: profile.bf_pct_self_estimate,
          threshold: bracket.threshold,
        })
      ) {
        await recordMilestoneIfNew(supabase, userId, bracket.key, {
          bf_pct_self_estimate: profile.bf_pct_self_estimate,
        });
      }
    }
  }

  // ===== State: weight 5lb below start =====
  // The "start" snapshot is the weight on the first nutrition
  // assessment's report_input_modifiers. If the user re-evaluates,
  // the row's created_at moves but the snapshot stays the same
  // because we read the modifiers JSON, which captures the value at
  // generation time.
  const nutritionForWeight = nutritionRow as
    | {
        created_at: string | null;
        goal_direction: string | null;
        report_input_modifiers: { current_weight_lbs?: number } | null;
      }
    | null;
  const startWeight =
    nutritionForWeight?.report_input_modifiers?.current_weight_lbs ?? null;
  if (
    nutritionForWeight &&
    detectWeight5lbBelowStart({
      current_weight_lbs: profile.current_weight_lbs,
      start_weight_lbs: startWeight,
      goal_direction: nutritionForWeight.goal_direction,
    })
  ) {
    await recordMilestoneIfNew(
      supabase,
      userId,
      STATIC_TRIGGER_KEYS.WEIGHT_5LB_BELOW_START,
      {
        current_weight_lbs: profile.current_weight_lbs,
        start_weight_lbs: startWeight,
        goal_direction: nutritionForWeight.goal_direction,
      },
    );
  }

  // ===== A3: wardrobe re-evaluation due (5% body-mass shift) =====
  // Reuses the same start-weight snapshot as WEIGHT_5LB_BELOW_START
  // (nutrition assessment's report_input_modifiers). Bidirectional
  // and not gated on goal_direction — gain or loss both shift fits.
  if (
    detectWardrobeReevalDue({
      current_weight_lbs: profile.current_weight_lbs,
      start_weight_lbs: startWeight,
    })
  ) {
    await recordMilestoneIfNew(
      supabase,
      userId,
      STATIC_TRIGGER_KEYS.WARDROBE_REEVAL_DUE,
      {
        current_weight_lbs: profile.current_weight_lbs,
        start_weight_lbs: startWeight,
        delta_pct:
          startWeight && profile.current_weight_lbs
            ? Math.round(
                (Math.abs(startWeight - profile.current_weight_lbs) /
                  startWeight) *
                  10000,
              ) / 100
            : null,
      },
    );
  }

  // ===== Behavioral: sleep consistency 4 weeks =====
  const sleepHours = ((sleepRows ?? []) as Array<{ hours: number | string }>)
    .map((r) => (typeof r.hours === 'string' ? Number(r.hours) : r.hours))
    .filter((h): h is number => Number.isFinite(h));
  if (detectSleepConsistency4Weeks({ logged_hours_last_28: sleepHours })) {
    await recordMilestoneIfNew(
      supabase,
      userId,
      STATIC_TRIGGER_KEYS.SLEEP_CONSISTENCY_4_WEEKS,
      { logged_nights: sleepHours.length },
    );
  }

  // ===== Pro: RHR trained-band entered =====
  // Fires once when the rolling 14d RHR avg drops below 60, AND the
  // user wasn't already there at baseline (their earliest 14-day
  // window of recorded RHR). Sourced from sleep_logs.resting_heart_rate
  // (mig 0095). Pro-gated: rhrSignals is hard-nulled for non-Pro users
  // at fetch time above, so the detector returns false for them.
  if (
    isPremium &&
    detectRhrTrainedBandEntered({
      rolling_avg_rhr_14d: rhrSignals.rolling_avg_rhr_14d,
      baseline_rhr: rhrSignals.baseline_rhr,
    })
  ) {
    await recordMilestoneIfNew(
      supabase,
      userId,
      STATIC_TRIGGER_KEYS.RHR_TRAINED_BAND_ENTERED,
      {
        rolling_avg_rhr_14d: rhrSignals.rolling_avg_rhr_14d,
        baseline_rhr: rhrSignals.baseline_rhr,
      },
    );
  }

  // ===== Pro: VO2max trend turned improving =====
  // Fires once when getVo2MaxSignal returns trend='improving' (latest
  // vs ~90 days prior, >5% gain). Once-per-user via the unique index;
  // subsequent improvements don't re-fire. Pro-gated.
  if (
    isPremium &&
    detectVo2MaxImproving({ trend: vo2MaxSignal.trend })
  ) {
    await recordMilestoneIfNew(
      supabase,
      userId,
      STATIC_TRIGGER_KEYS.VO2_MAX_IMPROVING,
      {
        latest_value: vo2MaxSignal.latest_value,
        latest_date: vo2MaxSignal.latest_date,
        trend: vo2MaxSignal.trend,
      },
    );
  }
}
