// Orchestrator for the Area 2 contextual prompt selector. Same
// pattern as lib/today/primary-action-picker — gather state in
// one parallel fetch, run pure detectors in priority order,
// return the first match or null.
//
// Returns ZERO or ONE prompt. Per the design constraint: an
// empty Area 2 is better than filler.
//
// Priority order (commit):
//   1. skipped_check_ins  (most urgent — disengagement signal)
//   2. nutrition_off_track  (behavior-anchored single-journey signal — fires before three weekly reflections accumulate; A1 from May 10 brain dump)
//   3. process_adherence_declining  (slow-burn signal — Phase F replacement for the legacy confidence-declining detector)
//   4. sleep_deficit_7d  (substrate-level — affects every other journey; C1 from May 7 brain dump)
//   5. cross_journey_dependency  (I1 — makes platform architecture visible; free sees one teaser, Pro sees full set)
//   6. glp1_hydration  (modifier-driven, gentle reminder)
//   7. sleep_variance_high  (recovery context for active lifters)

import type { SupabaseClient } from '@supabase/supabase-js';
import { getProtocolRollup } from '@/lib/interventions/service';
import {
  getCurrentFatigueState,
  getWeeklyReflectionState,
} from '@/lib/weekly-reflection/service';
import type { PrimaryActionKind } from '@/lib/today/types';
import { getSleepAssessment } from '@/lib/sleep/service';
import { getCardioAssessment } from '@/lib/cardio/service';
import { hasStrengthAssessment } from '@/lib/strength/service';
import type { ActivityChange } from '@/lib/weekly-reflection/types';
import type { WeeklyReflection } from '@/lib/weekly-reflection/service';
import { hasV2Data } from '@/lib/weekly-reflection/service';
import type { GoalDirection } from '@/lib/nutrition/types';
import {
  detectActivityChangeNutritionStale,
  detectCardioCutConflict,
  detectFatigueStrugglingSoftensStrength,
  detectGlp1Active,
  detectNutritionOffTrack,
  detectProcessAdherenceDeclining,
  detectSkippedCheckIns,
  detectSleepDeficit7d,
  detectSleepVarianceHigh,
} from './prompts';
import {
  copyActivityChangeNutritionStale,
  copyCardioCutConflict,
  copyFatigueSoftensStrength,
  copyGlp1Hydration,
  copyNutritionOffTrack,
  copyProcessAdherenceDeclining,
  copySkippedCheckIns,
  copySleepDeficit7d,
  copySleepVarianceHigh,
} from './copy';
import {
  PRIMARY_ACTION_INCOMPATIBILITIES,
  type ContextualPrompt,
  type ContextualPromptKind,
} from './types';

export async function selectContextualPrompt(
  supabase: SupabaseClient,
  userId: string,
  primaryActionKind: PrimaryActionKind,
  todayAppDay: string,
  // I1: isPremium gates the cross_journey_dependency detector set.
  // Free users get only cardio_cut_conflict (the teaser); Pro users
  // get the full set. Default false is the safer fallback when the
  // caller can't resolve premium status (unauthenticated read paths,
  // tests).
  isPremium: boolean = false,
): Promise<ContextualPrompt | null> {
  // Skip Area 2 entirely when the user is stepped away — they've
  // explicitly opted out of nudges.
  if (primaryActionKind === 'stepped_away') return null;

  const sevenDaysAgoIso = new Date(
    Date.now() - 7 * 24 * 60 * 60 * 1000,
  )
    .toISOString()
    .slice(0, 10);

  const [
    { data: latestCheckIn },
    reflectionState,
    glp1Rollup,
    { data: sleepRows },
    sleepAssessment,
    { data: nutritionPlanInfo },
    nutritionSignal,
    // I1: cross-journey dependency inputs. All cheap reads — the
    // nutrition + cardio + strength presence checks share patterns
    // already used by /today's primary-action picker, and the
    // fatigue state is a 1-row read with a 14d window.
    nutritionGoalRow,
    cardioAssessment,
    hasStrengthPlan,
    fatigueState,
  ] = await Promise.all([
    supabase
      .from('check_ins')
      .select('date')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .limit(1)
      .maybeSingle(),
    getWeeklyReflectionState(supabase, userId),
    getProtocolRollup(supabase, userId, 'glp1'),
    supabase
      .from('sleep_logs')
      .select('total_hours')
      .eq('user_id', userId)
      .gte('on_date', sevenDaysAgoIso)
      .order('on_date', { ascending: false })
      .limit(7),
    // Pulled so the sleep_deficit_7d copy can hint at the user's
    // primary blocker. Null when the user hasn't completed the
    // sleep assessment — the prompt still fires, just without the
    // blocker-specific tail.
    getSleepAssessment(supabase, userId),
    // Nutrition off-track inputs. Two cheap reads kept separate so
    // the detector stays a pure function — plan creation date + the
    // 7-day rolling adherence numbers + the lifetime engagement
    // baseline (capped at 3, since the detector only needs the
    // floor check).
    supabase
      .from('nutrition_assessments')
      .select('created_at')
      .eq('user_id', userId)
      .maybeSingle(),
    getNutritionOffTrackInputs(supabase, userId),
    // Goal direction + plan presence in one read.
    supabase
      .from('nutrition_assessments')
      .select('goal_direction, report_generated_at')
      .eq('user_id', userId)
      .maybeSingle()
      .then((res) => res.data),
    getCardioAssessment(supabase, userId),
    hasStrengthAssessment(supabase, userId).then((r) => r.hasReport),
    getCurrentFatigueState(supabase, userId),
  ]);

  const recentSleepHours = ((sleepRows ?? []) as Array<{
    total_hours: number | null;
  }>)
    .map((r) => r.total_hours)
    .filter((h): h is number => h != null);

  // ===== Bucket 1 — skipped_check_ins =====
  if (canFire('skipped_check_ins', primaryActionKind)) {
    const result = detectSkippedCheckIns({
      latestCheckInDate:
        (latestCheckIn as { date: string } | null)?.date ?? null,
      todayAppDay,
    });
    if (result.fires) {
      return copySkippedCheckIns(result.daysSince);
    }
  }

  // ===== Bucket 2 — nutrition_off_track (A1) =====
  // Single-journey behavioral signal — fires when the user proved
  // engagement, has a 14+ day old plan, and the log has either gone
  // quiet or hit ratio collapsed. Pulls ahead of
  // process_adherence_declining because behavior (actual logs) is
  // more reliable than tier self-report and arrives sooner.
  if (canFire('nutrition_off_track', primaryActionKind)) {
    const planCreatedAt =
      (nutritionPlanInfo as { created_at: string | null } | null)
        ?.created_at ?? null;
    const planAgeDays = planCreatedAt
      ? Math.floor(
          (Date.now() - new Date(planCreatedAt).getTime()) /
            (24 * 60 * 60 * 1000),
        )
      : 0;
    const result = detectNutritionOffTrack({
      hasNutritionPlan: planCreatedAt !== null,
      planAgeDays,
      lifetimeLogsCount: nutritionSignal.lifetimeLogsCount,
      hitLast7: nutritionSignal.hitLast7,
      loggedLast7: nutritionSignal.loggedLast7,
    });
    if (result.fires) {
      return copyNutritionOffTrack(result.shape);
    }
  }

  // ===== Bucket 3 — process_adherence_declining (Phase F) =====
  if (canFire('process_adherence_declining', primaryActionKind)) {
    const result = detectProcessAdherenceDeclining(reflectionState.history);
    if (result.fires) {
      return copyProcessAdherenceDeclining({
        weeksDeclining: result.weeksDeclining,
        decliningJourneysCount: result.decliningJourneys.length,
      });
    }
  }

  // ===== Bucket 4 — sleep_deficit_7d (C1) =====
  // Sleep deficit is substrate-level: it caps strength recovery,
  // hunger control, mood. Fires above glp1_hydration and
  // sleep_variance_high because the floor failing matters more than
  // either modifier reminder or recovery noise.
  if (canFire('sleep_deficit_7d', primaryActionKind)) {
    const result = detectSleepDeficit7d({
      recentTotalHours: recentSleepHours,
    });
    if (result.fires) {
      // First entry in biggest_blockers is the primary; copy uses
      // it for the inline blocker hint. Null when no assessment.
      const primaryBlocker =
        sleepAssessment?.biggest_blockers?.[0] ?? null;
      return copySleepDeficit7d({
        avgHours: result.avgHours,
        severity: result.severity,
        primaryBlocker,
      });
    }
  }

  // ===== Bucket 5 — cross_journey_dependency (I1) =====
  // Behavior-anchored cross-journey signals. Free tier runs only the
  // cardio_cut_conflict detector — the most visceral teaser of the
  // architecture (names two journeys in one sentence, clear math).
  // Pro tier runs the full set in visceral-to-subtle order so the
  // strongest signal surfaces when multiple are live.
  if (canFire('cross_journey_dependency', primaryActionKind)) {
    const nutritionGoal = (nutritionGoalRow as {
      goal_direction: GoalDirection;
      report_generated_at: string | null;
    } | null) ?? null;
    const hasNutritionPlan =
      nutritionGoal !== null && nutritionGoal.report_generated_at !== null;

    // 5a — cardio_cut_conflict (free + pro)
    const cardioConflict = detectCardioCutConflict({
      hasNutritionPlan,
      nutritionGoalDirection: nutritionGoal?.goal_direction ?? null,
      hasCardioPlan: cardioAssessment !== null,
      cardioDaysPerWeek: cardioAssessment?.days_per_week ?? null,
    });
    if (cardioConflict.fires) {
      return copyCardioCutConflict();
    }

    if (isPremium) {
      // 5b — fatigue_softens_strength (pro only)
      const fatigueSoftens = detectFatigueStrugglingSoftensStrength({
        hasStrengthPlan,
        fatigueLevel: fatigueState?.level ?? null,
        fatigueSource: fatigueState?.source ?? null,
      });
      if (fatigueSoftens.fires) {
        return copyFatigueSoftensStrength();
      }

      // 5c — activity_change_nutrition_stale (pro only)
      // Pull the most-recent v2 reflection's activity_change. Two-week
      // staleness window is enforced by ordering and filtering; the
      // detector itself just maps the value.
      const recentActivity = mostRecentActivityChangeWithinTwoWeeks(
        reflectionState.history,
        todayAppDay,
      );
      const activityStale = detectActivityChangeNutritionStale({
        hasNutritionPlan,
        recentActivityChange: recentActivity,
      });
      if (activityStale.fires) {
        return copyActivityChangeNutritionStale(activityStale.direction);
      }
    }
  }

  // ===== Bucket 6 — glp1_hydration =====
  if (canFire('glp1_hydration', primaryActionKind)) {
    const result = detectGlp1Active({
      hasActiveGlp1: glp1Rollup === 'on_protocol',
    });
    if (result.fires) {
      return copyGlp1Hydration();
    }
  }

  // ===== Bucket 7 — sleep_variance_high =====
  if (canFire('sleep_variance_high', primaryActionKind)) {
    const result = detectSleepVarianceHigh({
      recentTotalHours: recentSleepHours,
    });
    if (result.fires) {
      return copySleepVarianceHigh(result.sdHours);
    }
  }

  return null;
}

function canFire(
  kind: ContextualPromptKind,
  primaryActionKind: PrimaryActionKind,
): boolean {
  return !PRIMARY_ACTION_INCOMPATIBILITIES[kind].includes(primaryActionKind);
}

// Cheap roll-up for the nutrition_off_track detector. Reads up to 7
// rows in the last week (for hit-ratio) and counts lifetime rows
// with a head:true exact-count query (no row payload — just the
// number, capped at the engagement floor + 1 so a chatty logger
// doesn't make the planner work harder than it needs to).
export async function getNutritionOffTrackInputs(
  supabase: SupabaseClient,
  userId: string,
): Promise<{
  lifetimeLogsCount: number;
  hitLast7: number;
  loggedLast7: number;
}> {
  const sevenDaysAgoIso = new Date(
    Date.now() - 7 * 24 * 60 * 60 * 1000,
  )
    .toISOString()
    .slice(0, 10);

  const [{ data: recentRows }, { count: lifetimeCount }] = await Promise.all([
    supabase
      .from('nutrition_logs')
      .select('hit_target')
      .eq('user_id', userId)
      .gte('date', sevenDaysAgoIso)
      .order('date', { ascending: false })
      .limit(7),
    // head:true skips row payload — we only need the floor check.
    supabase
      .from('nutrition_logs')
      .select('user_id', { count: 'exact', head: true })
      .eq('user_id', userId),
  ]);

  const rows = (recentRows ?? []) as Array<{ hit_target: boolean }>;
  return {
    lifetimeLogsCount: lifetimeCount ?? 0,
    hitLast7: rows.filter((r) => r.hit_target).length,
    loggedLast7: rows.length,
  };
}

// Pull the most-recent v2 reflection's activity_change, gated to the
// two-week staleness window. Older signals shouldn't drive a "your
// plan is stale" prompt — too much can shift in a fortnight.
function mostRecentActivityChangeWithinTwoWeeks(
  history: WeeklyReflection[],
  todayAppDay: string,
): ActivityChange | null {
  const twoWeeksAgoMs =
    new Date(`${todayAppDay}T00:00:00Z`).getTime() -
    14 * 24 * 60 * 60 * 1000;
  const recent = [...history]
    .filter(hasV2Data)
    .sort((a, b) => b.week_start.localeCompare(a.week_start));
  for (const r of recent) {
    const t = new Date(`${r.week_start}T00:00:00Z`).getTime();
    if (Number.isNaN(t)) continue;
    if (t < twoWeeksAgoMs) return null;
    if (r.activity_change != null) return r.activity_change;
  }
  return null;
}
