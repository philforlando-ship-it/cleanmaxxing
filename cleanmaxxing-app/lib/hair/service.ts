// Hair assessments service. Owns all reads and writes against the
// hair_assessments table. The /plan/hair page reads through here, the
// /api/plan/hair/assessment route handler writes through here, and the
// /today HairPlanCard tile uses the lightweight has-assessment check
// to decide whether to surface the call-to-action.

import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  BaldingPattern,
  BaldingSeverity,
  CurrentRoutine,
  CutFamily,
  EarProminence,
  GrayingLevel,
  HairAssessment,
  HairAssessmentInput,
  HeadShape,
  HeadSize,
  ReportInputModifiers,
  Stage2Path,
} from './types';
import { CUT_FAMILIES } from './types';

export async function getHairAssessment(
  supabase: SupabaseClient,
  userId: string,
): Promise<HairAssessment | null> {
  const { data, error } = await supabase
    .from('hair_assessments')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return rowToAssessment(data);
}

// Lightweight has-assessment check used by the /today tile gate. Avoids
// pulling the full row (including the report blob) when all we need to
// know is whether a row exists.
export async function hasHairAssessment(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ hasAssessment: boolean; hasReport: boolean }> {
  const { data, error } = await supabase
    .from('hair_assessments')
    .select('user_id, report_generated_at')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return { hasAssessment: false, hasReport: false };
  return {
    hasAssessment: true,
    hasReport: data.report_generated_at !== null,
  };
}

export async function saveHairAssessment(
  supabase: SupabaseClient,
  userId: string,
  input: HairAssessmentInput,
): Promise<HairAssessment> {
  const row = {
    user_id: userId,
    face_shape: input.face_shape,
    density_state: input.density_state,
    hair_type_strand: input.hair_type_strand,
    hair_type_pattern: input.hair_type_pattern,
    hair_type_density: input.hair_type_density,
    head_shape: input.head_shape,
    head_size: input.head_size,
    graying_level: input.graying_level,
    ear_prominence: input.ear_prominence,
    balding_pattern: input.balding_pattern,
    balding_severity: input.balding_severity,
    current_routine: input.current_routine,
    hair_goal_text: input.hair_goal_text,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('hair_assessments')
    .upsert(row, { onConflict: 'user_id' })
    .select('*')
    .single();
  if (error) throw error;
  return rowToAssessment(data);
}

export async function saveHairReport(
  supabase: SupabaseClient,
  userId: string,
  args: {
    report_text: string;
    report_model: string;
    report_input_modifiers: ReportInputModifiers;
  },
): Promise<void> {
  const { error } = await supabase
    .from('hair_assessments')
    .update({
      report_text: args.report_text,
      report_generated_at: new Date().toISOString(),
      report_model: args.report_model,
      report_input_modifiers: args.report_input_modifiers,
      // Re-generating the report invalidates any stage 1 recommendation
      // we'd written off the previous report. Wipe it so the user
      // re-generates Stage 1 against the current report rather than
      // reading guidance written for an outdated diagnosis.
      stage_1_cut_family: null,
      stage_1_barber_text: null,
      stage_1_generated_at: null,
      stage_1_completed_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);
  if (error) throw error;
}

export async function saveHairStage1(
  supabase: SupabaseClient,
  userId: string,
  args: { cut_family: CutFamily; barber_text: string },
): Promise<void> {
  const { error } = await supabase
    .from('hair_assessments')
    .update({
      stage_1_cut_family: args.cut_family,
      stage_1_barber_text: args.barber_text,
      stage_1_generated_at: new Date().toISOString(),
      // Re-generating Stage 1 clears any prior completion — the user
      // hasn't gotten the new cut yet.
      stage_1_completed_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);
  if (error) throw error;
}

export async function markHairStage1Complete(
  supabase: SupabaseClient,
  userId: string,
): Promise<void> {
  const { error } = await supabase
    .from('hair_assessments')
    .update({
      stage_1_completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);
  if (error) throw error;
}

export async function saveHairStage3(
  supabase: SupabaseClient,
  userId: string,
  args: { recommendation_text: string; model: string },
): Promise<void> {
  const { error } = await supabase
    .from('hair_assessments')
    .update({
      stage_3_recommendation_text: args.recommendation_text,
      stage_3_generated_at: new Date().toISOString(),
      stage_3_model: args.model,
      // Re-generating Stage 3 clears prior acknowledgment — the user
      // hasn't confirmed they have the new picks yet.
      stage_3_acknowledged_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);
  if (error) throw error;
}

export async function ackHairStage3(
  supabase: SupabaseClient,
  userId: string,
): Promise<void> {
  const { error } = await supabase
    .from('hair_assessments')
    .update({
      stage_3_acknowledged_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);
  if (error) throw error;
}

// Stage 5 — start the photo-monitoring cadence. cadenceDays is computed
// at the route handler from modifier context (computeStage5DefaultCadence)
// and stored on the row. last_session_at stays null so the first session
// reads as "due now."
export async function startStage5(
  supabase: SupabaseClient,
  userId: string,
  cadenceDays: number,
): Promise<void> {
  const { error } = await supabase
    .from('hair_assessments')
    .update({
      stage_5_started_at: new Date().toISOString(),
      stage_5_cadence_days: cadenceDays,
      // Re-starting (rare path) preserves prior session count and
      // last_session_at — the user has already done the work; we're
      // just changing the schedule going forward.
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);
  if (error) throw error;
}

// Stage 5 — log a photo session. 24-hour dedup guards against accidental
// double-tap; otherwise sessions are quarterly and the user only logs
// when they actually take the photos.
export async function logStage5Session(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ deduped: boolean; newCount: number }> {
  const { data: row } = await supabase
    .from('hair_assessments')
    .select('stage_5_last_session_at, stage_5_session_count')
    .eq('user_id', userId)
    .maybeSingle();
  const r = row as
    | { stage_5_last_session_at: string | null; stage_5_session_count: number | null }
    | null;
  const last = r?.stage_5_last_session_at
    ? new Date(r.stage_5_last_session_at)
    : null;
  const now = new Date();
  if (last && now.getTime() - last.getTime() < 24 * 60 * 60 * 1000) {
    return { deduped: true, newCount: r?.stage_5_session_count ?? 0 };
  }

  const newCount = (r?.stage_5_session_count ?? 0) + 1;
  const { error } = await supabase
    .from('hair_assessments')
    .update({
      stage_5_last_session_at: now.toISOString(),
      stage_5_session_count: newCount,
      updated_at: now.toISOString(),
    })
    .eq('user_id', userId);
  if (error) throw error;
  return { deduped: false, newCount };
}

// Stage 6 — terminal stage start. cutCadenceWeeks is computed at the
// route handler from cut_family.
export async function startStage6(
  supabase: SupabaseClient,
  userId: string,
  cutCadenceWeeks: number,
): Promise<void> {
  const { error } = await supabase
    .from('hair_assessments')
    .update({
      stage_6_started_at: new Date().toISOString(),
      stage_6_cut_cadence_weeks: cutCadenceWeeks,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);
  if (error) throw error;
}

// Pattern D — mark the user as having started treatment from the
// Considering surface. Soft signal — the user is also expected to
// update user_profile.current_interventions independently once they're
// actually on fin/min. Both signals are checked at render time; either
// one flips the UI to On Protocol framing.
export async function markPatternDTreatmentStarted(
  supabase: SupabaseClient,
  userId: string,
): Promise<void> {
  const { error } = await supabase
    .from('hair_assessments')
    .update({
      pattern_d_treatment_started_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);
  if (error) throw error;
}

// Stage 4 — daily routine.
export type Stage4State = {
  isStarted: boolean;
  isComplete: boolean;
  target: number | null;
  count: number;
  hasLoggedToday: boolean;
  startedAt: string | null;
  completedAt: string | null;
};

// Stage 5 unlock gate. Loosened on 2026-05-08 — the original gate was
// "Stage 4 completed (14 daily logs hit target)" which forced ~3 weeks
// of constant logging to unlock photo monitoring. The new gate also
// unlocks after 14 calendar days from Stage 4 start, provided the user
// has logged at least once. Counts as "engaged enough to be ready for
// the next stage" without requiring perfect consistency.
const STAGE_5_CALENDAR_DAYS = 14;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function canStartStage5(
  assessment: HairAssessment,
  stage4Count: number,
): boolean {
  if (!assessment.stage_4_started_at) return false;
  // Original gate — count threshold met (target_check_ins logged).
  if (assessment.stage_4_completed_at) return true;
  // Loosened gate — 2 calendar weeks elapsed AND at least one log.
  const startedMs = new Date(assessment.stage_4_started_at).getTime();
  const elapsedDays = (Date.now() - startedMs) / MS_PER_DAY;
  return elapsedDays >= STAGE_5_CALENDAR_DAYS && stage4Count >= 1;
}

export async function getStage4State(
  supabase: SupabaseClient,
  userId: string,
  assessment: HairAssessment,
  todayAppDay: string,
): Promise<Stage4State> {
  if (!assessment.stage_4_started_at || !assessment.stage_4_target_check_ins) {
    return {
      isStarted: false,
      isComplete: false,
      target: null,
      count: 0,
      hasLoggedToday: false,
      startedAt: null,
      completedAt: null,
    };
  }

  // Count rows + check today's row in one round-trip via .select with
  // count: 'exact'. We could also pull all rows and filter; for v1
  // counts that's fine but two queries is cleaner.
  const { count } = await supabase
    .from('hair_daily_routine_logs')
    .select('on_date', { count: 'exact', head: true })
    .eq('user_id', userId);

  const { data: todayRow } = await supabase
    .from('hair_daily_routine_logs')
    .select('on_date')
    .eq('user_id', userId)
    .eq('on_date', todayAppDay)
    .maybeSingle();

  const totalCount = count ?? 0;
  // isComplete now reflects the loosened Stage 5 unlock gate (count
  // threshold OR 14 calendar days + ≥1 log). The DB column
  // stage_4_completed_at remains the source of truth for the count
  // threshold; the calendar-gate side is computed at read time.
  const isComplete = canStartStage5(assessment, totalCount);
  return {
    isStarted: true,
    isComplete,
    target: assessment.stage_4_target_check_ins,
    count: totalCount,
    hasLoggedToday: todayRow !== null,
    startedAt: assessment.stage_4_started_at,
    completedAt: assessment.stage_4_completed_at,
  };
}

export async function startStage4(
  supabase: SupabaseClient,
  userId: string,
  target: number,
): Promise<void> {
  const { error } = await supabase
    .from('hair_assessments')
    .update({
      stage_4_started_at: new Date().toISOString(),
      stage_4_target_check_ins: target,
      // Re-starting clears prior completion. Rare path — user has to
      // explicitly opt back in. Logs aren't deleted, so the count
      // resumes from where it was; that's intentional, the user has
      // already done the work.
      stage_4_completed_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);
  if (error) throw error;
}

export async function logHairRoutineForToday(
  supabase: SupabaseClient,
  userId: string,
  todayAppDay: string,
): Promise<{ count: number; isComplete: boolean }> {
  // Upsert today's row. A second tap on the same day is a no-op (the
  // PK conflict on (user_id, on_date) preserves the original logged_at
  // — no double-credit possible).
  const { error: insErr } = await supabase
    .from('hair_daily_routine_logs')
    .upsert(
      { user_id: userId, on_date: todayAppDay },
      { onConflict: 'user_id,on_date', ignoreDuplicates: true },
    );
  if (insErr) throw insErr;

  // Re-count and check if we've hit the target. If so, mark Stage 4
  // complete on the assessment row in the same call.
  const { count } = await supabase
    .from('hair_daily_routine_logs')
    .select('on_date', { count: 'exact', head: true })
    .eq('user_id', userId);

  const totalCount = count ?? 0;

  // Read target + current completion to decide if we should set
  // completed_at. Done as a separate read because the count above
  // doesn't tell us either of those.
  const { data: assessmentRow } = await supabase
    .from('hair_assessments')
    .select('stage_4_target_check_ins, stage_4_completed_at')
    .eq('user_id', userId)
    .maybeSingle();
  const target =
    (assessmentRow as { stage_4_target_check_ins: number | null } | null)
      ?.stage_4_target_check_ins ?? null;
  const alreadyComplete = Boolean(
    (assessmentRow as { stage_4_completed_at: string | null } | null)
      ?.stage_4_completed_at,
  );

  let isComplete = alreadyComplete;
  if (!alreadyComplete && target !== null && totalCount >= target) {
    const { error: updErr } = await supabase
      .from('hair_assessments')
      .update({
        stage_4_completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);
    if (updErr) throw updErr;
    isComplete = true;
  }

  return { count: totalCount, isComplete };
}

// Stage 2 — lock in the user's path. Pre-Tier-3, the 'treat' path
// also created a hair-loss-start-plan goal in the legacy goals
// table as a state marker. That marker retired with the goals
// system (Tier 3 cleanup, 2026-05-10) — stage_2_path itself is now
// the single source of truth for the user's chosen path, and the
// stage_2_pattern_d_goal_id column was dropped alongside the goals
// table.
export async function lockInStage2(
  supabase: SupabaseClient,
  userId: string,
  path: Stage2Path,
): Promise<void> {
  const { error } = await supabase
    .from('hair_assessments')
    .update({
      stage_2_path: path,
      stage_2_locked_in_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);
  if (error) throw error;
}

// Coerce a Supabase row into the HairAssessment shape. The jsonb
// current_routine column comes back as `unknown` from the SDK; coerce
// with sane defaults for any field that's missing (defensive against
// older rows written before the shape stabilized).
function rowToAssessment(row: unknown): HairAssessment {
  const r = row as Record<string, unknown>;
  const rawCutFamily = r.stage_1_cut_family as string | null | undefined;
  const cutFamily: CutFamily | null =
    rawCutFamily && (CUT_FAMILIES as readonly string[]).includes(rawCutFamily)
      ? (rawCutFamily as CutFamily)
      : null;
  return {
    user_id: r.user_id as string,
    face_shape: r.face_shape as HairAssessment['face_shape'],
    density_state: r.density_state as HairAssessment['density_state'],
    hair_type_strand: r.hair_type_strand as HairAssessment['hair_type_strand'],
    hair_type_pattern: r.hair_type_pattern as HairAssessment['hair_type_pattern'],
    hair_type_density: r.hair_type_density as HairAssessment['hair_type_density'],
    head_shape: coerceHeadShape(r.head_shape),
    head_size: coerceHeadSize(r.head_size),
    graying_level: coerceGrayingLevel(r.graying_level),
    ear_prominence: coerceEarProminence(r.ear_prominence),
    balding_pattern: coerceBaldingPattern(r.balding_pattern),
    balding_severity: coerceBaldingSeverity(r.balding_severity),
    current_routine: coerceRoutine(r.current_routine),
    hair_goal_text: (r.hair_goal_text as string | null) ?? null,
    report_text: (r.report_text as string | null) ?? null,
    report_generated_at: (r.report_generated_at as string | null) ?? null,
    report_model: (r.report_model as string | null) ?? null,
    report_input_modifiers:
      (r.report_input_modifiers as ReportInputModifiers | null) ?? null,
    stage_1_cut_family: cutFamily,
    stage_1_barber_text: (r.stage_1_barber_text as string | null) ?? null,
    stage_1_generated_at: (r.stage_1_generated_at as string | null) ?? null,
    stage_1_completed_at: (r.stage_1_completed_at as string | null) ?? null,
    stage_2_path: coerceStage2Path(r.stage_2_path),
    stage_2_locked_in_at: (r.stage_2_locked_in_at as string | null) ?? null,
    stage_3_recommendation_text:
      (r.stage_3_recommendation_text as string | null) ?? null,
    stage_3_generated_at: (r.stage_3_generated_at as string | null) ?? null,
    stage_3_model: (r.stage_3_model as string | null) ?? null,
    stage_3_acknowledged_at:
      (r.stage_3_acknowledged_at as string | null) ?? null,
    stage_4_started_at: (r.stage_4_started_at as string | null) ?? null,
    stage_4_target_check_ins:
      typeof r.stage_4_target_check_ins === 'number'
        ? r.stage_4_target_check_ins
        : null,
    stage_4_completed_at: (r.stage_4_completed_at as string | null) ?? null,
    pattern_d_treatment_started_at:
      (r.pattern_d_treatment_started_at as string | null) ?? null,
    stage_5_started_at: (r.stage_5_started_at as string | null) ?? null,
    stage_5_cadence_days:
      typeof r.stage_5_cadence_days === 'number'
        ? r.stage_5_cadence_days
        : null,
    stage_5_last_session_at:
      (r.stage_5_last_session_at as string | null) ?? null,
    stage_5_session_count:
      typeof r.stage_5_session_count === 'number'
        ? r.stage_5_session_count
        : 0,
    stage_6_started_at: (r.stage_6_started_at as string | null) ?? null,
    stage_6_cut_cadence_weeks:
      typeof r.stage_6_cut_cadence_weeks === 'number'
        ? r.stage_6_cut_cadence_weeks
        : null,
    created_at: r.created_at as string,
    updated_at: r.updated_at as string,
  };
}

function coerceStage2Path(value: unknown): Stage2Path | null {
  if (value === 'treat' || value === 'monitor' || value === 'transition') {
    return value;
  }
  return null;
}

function coerceHeadShape(value: unknown): HeadShape | null {
  if (value === 'round' || value === 'oval' || value === 'oblong') {
    return value;
  }
  return null;
}

function coerceHeadSize(value: unknown): HeadSize | null {
  if (value === 'small' || value === 'average' || value === 'large') {
    return value;
  }
  return null;
}

function coerceGrayingLevel(value: unknown): GrayingLevel | null {
  if (
    value === 'none' ||
    value === 'scattered' ||
    value === 'peppered' ||
    value === 'salt_and_pepper' ||
    value === 'mostly_gray'
  ) {
    return value;
  }
  return null;
}

function coerceEarProminence(value: unknown): EarProminence | null {
  if (value === 'low' || value === 'average' || value === 'prominent') {
    return value;
  }
  return null;
}

function coerceBaldingPattern(value: unknown): BaldingPattern | null {
  if (
    value === 'none' ||
    value === 'front' ||
    value === 'vertex' ||
    value === 'front_and_vertex' ||
    value === 'diffuse'
  ) {
    return value;
  }
  return null;
}

function coerceBaldingSeverity(value: unknown): BaldingSeverity | null {
  if (
    value === 0 ||
    value === 1 ||
    value === 2 ||
    value === 3 ||
    value === 4
  ) {
    return value;
  }
  return null;
}

function coerceRoutine(value: unknown): CurrentRoutine {
  if (!value || typeof value !== 'object') {
    return {
      cut_cadence_weeks: null,
      products_used: null,
      uses_blow_dry: false,
      who_cuts: null,
    };
  }
  const v = value as Record<string, unknown>;
  return {
    cut_cadence_weeks:
      typeof v.cut_cadence_weeks === 'number' ? v.cut_cadence_weeks : null,
    products_used:
      typeof v.products_used === 'string' ? v.products_used : null,
    uses_blow_dry: v.uses_blow_dry === true,
    who_cuts:
      v.who_cuts === 'self' ||
      v.who_cuts === 'chain' ||
      v.who_cuts === 'dedicated_barber'
        ? v.who_cuts
        : null,
  };
}
