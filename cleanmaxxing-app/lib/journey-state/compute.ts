// Per-journey phase computation. Pure-ish — fetches signals from the
// DB then runs deterministic rules. The orchestrator (persist.ts)
// diffs the result against journey_states and writes deltas.
//
// Phase per journey (v1 — see scope-of-Slice-1 doc 2026-05-11):
//   hair             Stage 4 completed + >=4 wks elapsed
//                    OR Pattern D on protocol >=12 wks
//   style            stage_3_acknowledged_at non-null + >=4 wks elapsed
//                    drifting when bf_drift_silhouette fires
//   body_composition goal_direction='maintain' + assessment >=8 wks
//                    OR |current - goal_weight| <=3 + assessment >=8 wks
//   strength         >=36 strength workouts in last 12 wks (avg >=3/wk)
//   cardio           >=12 cardio workouts in last 12 wks (avg >=1/wk)
//   sleep            SD <=1hr over last 28 logged nights AND avg >=7
//   skincare         assessment >=8 wks old
//   facial_hair      assessment >=8 wks old
//
// Absence of an assessment row leaves the slug missing from the
// result — the user hasn't started this journey at all. Distinguished
// from 'implementing' (started but not yet graduated).

import type { SupabaseClient } from '@supabase/supabase-js';
import { isStyleReportStale } from '@/lib/style/service';
import { getUserProfile } from '@/lib/profile/service';

const DAYS_MS = 24 * 60 * 60 * 1000;

export type JourneySlug =
  | 'hair'
  | 'style'
  | 'body_composition'
  | 'strength'
  | 'cardio'
  | 'sleep'
  | 'skincare'
  | 'facial_hair';

export type JourneyPhase = 'implementing' | 'maintaining' | 'drifting';

export type ComputedJourneyState = {
  phase: JourneyPhase;
  source: string;
};

export type ComputedJourneyStates = Partial<
  Record<JourneySlug, ComputedJourneyState>
>;

type HairRow = {
  stage_4_completed_at: string | null;
  pattern_d_treatment_started_at: string | null;
  stage_2_path: string | null;
};

type StyleRow = {
  stage_3_acknowledged_at: string | null;
  report_input_modifiers: Record<string, unknown> | null;
};

type NutritionRow = {
  created_at: string;
  goal_direction: string | null;
  goal_weight_lbs: number | null;
};

type DatedRow = { created_at: string };

export async function computeAllJourneyPhases(
  supabase: SupabaseClient,
  userId: string,
  now: Date = new Date(),
): Promise<ComputedJourneyStates> {
  const nowMs = now.getTime();
  const twelveWeeksAgo = new Date(nowMs - 12 * 7 * DAYS_MS)
    .toISOString()
    .slice(0, 10);
  const fourWeeksAgo = new Date(nowMs - 28 * DAYS_MS).toISOString().slice(0, 10);

  const [
    { data: hairRow },
    { data: styleRow },
    { data: nutritionRow },
    { data: skincareRow },
    { data: facialHairRow },
    { data: sleepRows },
    { data: strengthWorkoutRows },
    { data: cardioWorkoutRows },
    profile,
    { data: userRow },
  ] = await Promise.all([
    supabase
      .from('hair_assessments')
      .select(
        'stage_4_completed_at, pattern_d_treatment_started_at, stage_2_path',
      )
      .eq('user_id', userId)
      .maybeSingle(),
    supabase
      .from('style_assessments')
      .select('stage_3_acknowledged_at, report_input_modifiers')
      .eq('user_id', userId)
      .maybeSingle(),
    supabase
      .from('nutrition_assessments')
      .select('created_at, goal_direction, goal_weight_lbs')
      .eq('user_id', userId)
      .maybeSingle(),
    supabase
      .from('skincare_assessments')
      .select('created_at')
      .eq('user_id', userId)
      .maybeSingle(),
    supabase
      .from('facial_hair_assessments')
      .select('created_at')
      .eq('user_id', userId)
      .maybeSingle(),
    supabase
      .from('sleep_logs')
      .select('hours')
      .eq('user_id', userId)
      .gte('night_of', fourWeeksAgo),
    supabase
      .from('workout_logs')
      .select('performed_on')
      .eq('user_id', userId)
      .eq('type', 'strength')
      .gte('performed_on', twelveWeeksAgo),
    supabase
      .from('workout_logs')
      .select('performed_on')
      .eq('user_id', userId)
      .eq('type', 'cardio')
      .gte('performed_on', twelveWeeksAgo),
    getUserProfile(supabase, userId),
    supabase.from('users').select('age').eq('id', userId).maybeSingle(),
  ]);

  const userAge =
    (userRow as { age: number | null } | null)?.age ?? null;

  const out: ComputedJourneyStates = {};

  const hair = hairRow as HairRow | null;
  if (hair) {
    out.hair = computeHairPhase(hair, nowMs);
  }

  const style = styleRow as StyleRow | null;
  if (style) {
    out.style = computeStylePhase(
      style,
      { ...profile, age: userAge },
      nowMs,
    );
  }

  const nutrition = nutritionRow as NutritionRow | null;
  if (nutrition) {
    out.body_composition = computeBodyCompositionPhase(
      nutrition,
      profile.current_weight_lbs as number | null,
      nowMs,
    );
  }

  // Strength: maintenance only when the user has shown 12 wks of
  // cadence. A new strength_assessments row alone doesn't put them in
  // implementing — they need workout logs of type=strength for the
  // journey to register as "started" at all. (Matches the
  // strength_consistency_8_weeks milestone shape.)
  const strengthDates = (strengthWorkoutRows ?? []) as Array<{
    performed_on: string;
  }>;
  if (strengthDates.length > 0) {
    out.strength = computeStrengthPhase(strengthDates.length);
  }

  const cardioDates = (cardioWorkoutRows ?? []) as Array<{
    performed_on: string;
  }>;
  if (cardioDates.length > 0) {
    out.cardio = computeCardioPhase(cardioDates.length);
  }

  const sleepHours = ((sleepRows ?? []) as Array<{ hours: number | string }>)
    .map((r) => (typeof r.hours === 'string' ? Number(r.hours) : r.hours))
    .filter((h): h is number => Number.isFinite(h));
  if (sleepHours.length >= 14) {
    // Need at least two weeks of logged nights before sleep is
    // 'active' enough to even register as a journey.
    out.sleep = computeSleepPhase(sleepHours);
  }

  const skincare = skincareRow as DatedRow | null;
  if (skincare) {
    out.skincare = computeAssessmentAgePhase(
      skincare.created_at,
      nowMs,
      8 * 7 * DAYS_MS,
      'skincare_assessment_8wks',
    );
  }

  const facialHair = facialHairRow as DatedRow | null;
  if (facialHair) {
    out.facial_hair = computeAssessmentAgePhase(
      facialHair.created_at,
      nowMs,
      8 * 7 * DAYS_MS,
      'facial_hair_assessment_8wks',
    );
  }

  return out;
}

// ============================================================
// Per-journey pure rules
// ============================================================

function computeHairPhase(
  hair: HairRow,
  nowMs: number,
): ComputedJourneyState {
  // Pattern A: Stage 4 completed AND >=4 wks since completion.
  if (hair.stage_4_completed_at) {
    const completedMs = new Date(hair.stage_4_completed_at).getTime();
    if (nowMs - completedMs >= 4 * 7 * DAYS_MS) {
      return { phase: 'maintaining', source: 'hair_stage_4_plus_4wks' };
    }
  }
  // Pattern D on protocol: started AND >=12 wks elapsed.
  if (
    hair.stage_2_path === 'treat' &&
    hair.pattern_d_treatment_started_at
  ) {
    const startedMs = new Date(hair.pattern_d_treatment_started_at).getTime();
    if (nowMs - startedMs >= 12 * 7 * DAYS_MS) {
      return {
        phase: 'maintaining',
        source: 'pattern_d_on_protocol_12wks',
      };
    }
  }
  return { phase: 'implementing', source: 'hair_assessment_active' };
}

function computeStylePhase(
  style: StyleRow,
  profile: {
    bf_pct_self_estimate: string | null;
    budget_tier: string | null;
    current_interventions: string[] | null;
    age: number | null;
  },
  nowMs: number,
): ComputedJourneyState {
  // Drift takes precedence over maintenance — if the silhouette tier
  // has changed, the closet is functionally drifting regardless of
  // whether they reached stage 3.
  const stalenessReasons = isStyleReportStale(
    style.report_input_modifiers as Parameters<typeof isStyleReportStale>[0],
    {
      bf_pct_self_estimate: profile.bf_pct_self_estimate,
      budget_tier: profile.budget_tier,
      current_interventions: profile.current_interventions ?? [],
      age: profile.age,
    },
  );
  if (stalenessReasons.includes('bf_drift_silhouette')) {
    return { phase: 'drifting', source: 'style_bf_drift_silhouette' };
  }

  if (style.stage_3_acknowledged_at) {
    const ackMs = new Date(style.stage_3_acknowledged_at).getTime();
    if (nowMs - ackMs >= 4 * 7 * DAYS_MS) {
      return { phase: 'maintaining', source: 'style_stage_3_plus_4wks' };
    }
  }
  return { phase: 'implementing', source: 'style_assessment_active' };
}

function computeBodyCompositionPhase(
  nutrition: NutritionRow,
  currentWeightLbs: number | null,
  nowMs: number,
): ComputedJourneyState {
  const assessmentMs = new Date(nutrition.created_at).getTime();
  const eightWeeksOld = nowMs - assessmentMs >= 8 * 7 * DAYS_MS;

  // Explicit maintain intent + sustained over 8 wks of assessment age.
  if (nutrition.goal_direction === 'maintain' && eightWeeksOld) {
    return { phase: 'maintaining', source: 'goal_direction_maintain_8wks' };
  }

  // Goal weight reached and held — current within +/-3 lbs of goal,
  // and assessment is at least 8 wks old (proxy for "held it for a
  // while" given we don't have continuous weight history here).
  if (
    nutrition.goal_weight_lbs &&
    currentWeightLbs &&
    Math.abs(currentWeightLbs - nutrition.goal_weight_lbs) <= 3 &&
    eightWeeksOld
  ) {
    return {
      phase: 'maintaining',
      source: 'goal_weight_within_3lb_8wks',
    };
  }

  return { phase: 'implementing', source: 'nutrition_assessment_active' };
}

function computeStrengthPhase(sessionsLast12Wks: number): ComputedJourneyState {
  // Avg >=3 sessions/wk over 12 wks = 36+ sessions in the window.
  // training_experience dropped per Slice 1 default — pure cadence.
  if (sessionsLast12Wks >= 36) {
    return { phase: 'maintaining', source: 'strength_12wks_36plus_sessions' };
  }
  return { phase: 'implementing', source: 'strength_workouts_active' };
}

function computeCardioPhase(sessionsLast12Wks: number): ComputedJourneyState {
  // v1 simplification: 1+ session/wk over 12 wks. The proper
  // adherence-vs-prescribed signal needs a cardio_prescriptions table
  // that doesn't exist yet — revisit when it does.
  if (sessionsLast12Wks >= 12) {
    return { phase: 'maintaining', source: 'cardio_12wks_12plus_sessions' };
  }
  return { phase: 'implementing', source: 'cardio_workouts_active' };
}

function computeSleepPhase(loggedHoursLast28: number[]): ComputedJourneyState {
  if (loggedHoursLast28.length < 14) {
    return { phase: 'implementing', source: 'sleep_logs_too_sparse' };
  }
  const mean =
    loggedHoursLast28.reduce((a, b) => a + b, 0) / loggedHoursLast28.length;
  const variance =
    loggedHoursLast28.reduce((acc, h) => acc + (h - mean) ** 2, 0) /
    loggedHoursLast28.length;
  const sd = Math.sqrt(variance);
  if (sd <= 1 && mean >= 7) {
    return { phase: 'maintaining', source: 'sleep_sd_under_1_avg_7plus' };
  }
  return { phase: 'implementing', source: 'sleep_logs_active' };
}

function computeAssessmentAgePhase(
  assessmentCreatedAt: string,
  nowMs: number,
  thresholdMs: number,
  source: string,
): ComputedJourneyState {
  const createdMs = new Date(assessmentCreatedAt).getTime();
  if (nowMs - createdMs >= thresholdMs) {
    return { phase: 'maintaining', source };
  }
  return { phase: 'implementing', source: `${source}_pending` };
}
