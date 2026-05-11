// Server-side helpers for the nutrition tracker AND the
// nutrition / body-comp assessment + report layer. Tracker reads come
// first (getNutritionState below). Assessment CRUD + the live signal
// the report generator consumes (getRecentProteinSignal) follow.
//
// Intentionally small tracker: hit/miss + optional grams. We don't
// store a per-user target — the brand position is that the user
// knows their number (0.75–1.0 g/lb baseline by goal, 1.1 on GLP-1;
// see lib/nutrition/tdee.ts for the per-cohort matrix) and the log
// is about felt-sense compliance, not surveillance. A future macro
// tracker is its own product.

import type { SupabaseClient } from '@supabase/supabase-js';
import { addDaysToAppDay, appDayFor } from '@/lib/date/app-day';
import type {
  NutritionAssessment,
  NutritionAssessmentInput,
  NutritionFoodPreferencesInput,
  NutritionReportInputModifiers,
} from './types';
import { FOODS } from './types';
import type { NutritionTargets } from './tdee';

export type NutritionLog = {
  date: string; // YYYY-MM-DD app-day
  hit_target: boolean;
  protein_grams: number | null;
  notes: string | null;
};

export type NutritionState = {
  // Today's row, when present.
  today: NutritionLog | null;
  // Recent 14 logs, oldest first.
  recent: NutritionLog[];
  // Count of "hit" days in the last 7 logged days. Mirrors the
  // sleep service's rollingAvg — quiet context, no scoring.
  hitLast7: number;
  loggedLast7: number;
};

const RECENT_LIMIT = 14;
const ROLLING_WINDOW = 7;

export async function getNutritionState(
  supabase: SupabaseClient,
  userId: string,
  timezone: string,
  now: Date = new Date(),
): Promise<NutritionState> {
  const today = appDayFor(timezone, now);
  const windowStart = addDaysToAppDay(today, -(ROLLING_WINDOW - 1));

  const { data, error } = await supabase
    .from('nutrition_logs')
    .select('date, hit_target, protein_grams, notes')
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .limit(RECENT_LIMIT);

  if (error) {
    return { today: null, recent: [], hitLast7: 0, loggedLast7: 0 };
  }

  const rows = (data ?? []).map((r) => {
    const row = r as {
      date: string;
      hit_target: boolean;
      protein_grams: number | null;
      notes: string | null;
    };
    return {
      date: row.date,
      hit_target: row.hit_target,
      protein_grams: row.protein_grams,
      notes: row.notes,
    };
  });

  const todayRow = rows.find((r) => r.date === today) ?? null;
  const inWindow = rows.filter((r) => r.date >= windowStart && r.date <= today);
  const hitLast7 = inWindow.filter((r) => r.hit_target).length;
  const loggedLast7 = inWindow.length;

  return {
    today: todayRow,
    recent: rows.slice().reverse(),
    hitLast7,
    loggedLast7,
  };
}

// ===========================================================
// Nutrition assessment / plan (Pattern A v0)
// ===========================================================

export async function getNutritionAssessment(
  supabase: SupabaseClient,
  userId: string,
): Promise<NutritionAssessment | null> {
  const { data, error } = await supabase
    .from('nutrition_assessments')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return rowToAssessment(data);
}

export async function hasNutritionAssessment(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ hasAssessment: boolean; hasReport: boolean }> {
  const { data, error } = await supabase
    .from('nutrition_assessments')
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

export async function saveNutritionAssessment(
  supabase: SupabaseClient,
  userId: string,
  input: NutritionAssessmentInput,
): Promise<NutritionAssessment> {
  // Goal-weight inputs only carry through when goal_direction is
  // 'lose_fat'. The form should already not be sending them
  // otherwise, but this is the belt-and-suspenders normalization so a
  // stale client can't persist orphan goal data.
  const isCutting = input.goal_direction === 'lose_fat';
  const row = {
    user_id: userId,
    goal_direction: input.goal_direction,
    urgency: input.urgency,
    eating_context: input.eating_context,
    what_tried: input.what_tried,
    fasting_protocol: input.fasting_protocol,
    alcohol_use: input.alcohol_use,
    cannabis_use: input.cannabis_use,
    cheat_day_pattern: input.cheat_day_pattern,
    cooking_capacity: input.cooking_capacity,
    dietary_pattern: input.dietary_pattern,
    meal_service_willingness: input.meal_service_willingness,
    snacking_style: input.snacking_style,
    gut_sensitivity: input.gut_sensitivity,
    goal_weight_lbs: isCutting ? input.goal_weight_lbs : null,
    goal_target_weeks: isCutting ? input.goal_target_weeks : null,
    bf_pct_assessment: input.bf_pct_assessment,
    nutrition_goal_text: input.nutrition_goal_text,
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await supabase
    .from('nutrition_assessments')
    .upsert(row, { onConflict: 'user_id' })
    .select('*')
    .single();
  if (error) throw error;
  return rowToAssessment(data);
}

// Save the food picker preferences without triggering report
// regeneration. Slugs filtered against the catalog so unknown slugs
// from a stale client don't persist.
export async function saveFoodPreferences(
  supabase: SupabaseClient,
  userId: string,
  input: NutritionFoodPreferencesInput,
): Promise<NutritionAssessment> {
  const validSlugs = new Set(FOODS.map((f) => f.slug));
  const preferences = input.food_preferences.filter((s) => validSlugs.has(s));
  const exclusions = input.food_exclusions.filter((s) => validSlugs.has(s));

  const { data, error } = await supabase
    .from('nutrition_assessments')
    .update({
      food_preferences: preferences,
      food_exclusions: exclusions,
      food_filter_text: input.food_filter_text,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .select('*')
    .single();
  if (error) throw error;
  return rowToAssessment(data);
}

// Persist the computed TDEE / macro targets onto the assessment row.
// Called from the report generator after computeNutritionTargets so the
// numbers stay snapshotted with the report instead of recomputed every
// page render (also lets the page render targets without re-running
// the formula on the client).
export async function saveNutritionTargets(
  supabase: SupabaseClient,
  userId: string,
  targets: NutritionTargets,
): Promise<void> {
  const { error } = await supabase
    .from('nutrition_assessments')
    .update({
      tdee_estimate: targets.tdee_estimate,
      calorie_target: targets.calorie_target,
      protein_target_g: targets.protein_target_g,
      carb_target_g: targets.carb_target_g,
      fat_target_g: targets.fat_target_g,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);
  if (error) throw error;
}

// Persist the safe-rate snapshot onto the assessment row at
// report-gen time. Called after the weight-loss-plan computation so
// the report-prompt framing and the row stay in sync.
export async function saveWeightLossPlanSnapshot(
  supabase: SupabaseClient,
  userId: string,
  args: {
    safe_max_weekly_pct: number | null;
    realistic_target_weeks: number | null;
  },
): Promise<void> {
  const { error } = await supabase
    .from('nutrition_assessments')
    .update({
      safe_max_weekly_pct: args.safe_max_weekly_pct,
      realistic_target_weeks: args.realistic_target_weeks,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);
  if (error) throw error;
}

export async function saveNutritionReport(
  supabase: SupabaseClient,
  userId: string,
  args: {
    report_text: string;
    report_model: string;
    report_input_modifiers: NutritionReportInputModifiers;
  },
): Promise<void> {
  const { error } = await supabase
    .from('nutrition_assessments')
    .update({
      report_text: args.report_text,
      report_generated_at: new Date().toISOString(),
      report_model: args.report_model,
      report_input_modifiers: args.report_input_modifiers,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);
  if (error) throw error;
}

// Live data signal: how many of the last N protein-log days the user
// hit their protein target. Used as a modifier in the nutrition
// report — same shape as sleep's rolling avg. Date filter uses raw
// calendar days here because nutrition_logs.date is the user's
// app-day already, and the report's tolerance for ±1 day is fine.
export type ProteinSignal = {
  window_days: number;
  hit_days: number;
  logged_days: number;
};

const DEFAULT_PROTEIN_WINDOW = 14;

export async function getRecentProteinSignal(
  supabase: SupabaseClient,
  userId: string,
  windowDays = DEFAULT_PROTEIN_WINDOW,
): Promise<ProteinSignal> {
  const since = new Date(
    Date.now() - windowDays * 24 * 60 * 60 * 1000,
  )
    .toISOString()
    .slice(0, 10);
  const { data, error } = await supabase
    .from('nutrition_logs')
    .select('hit_target')
    .eq('user_id', userId)
    .gte('date', since);
  if (error) {
    return { window_days: windowDays, hit_days: 0, logged_days: 0 };
  }
  const rows = (data ?? []) as Array<{ hit_target: boolean }>;
  return {
    window_days: windowDays,
    hit_days: rows.filter((r) => r.hit_target).length,
    logged_days: rows.length,
  };
}

function rowToAssessment(row: unknown): NutritionAssessment {
  const r = row as Record<string, unknown>;
  return {
    user_id: r.user_id as string,
    goal_direction:
      r.goal_direction as NutritionAssessment['goal_direction'],
    urgency: r.urgency as NutritionAssessment['urgency'],
    eating_context:
      r.eating_context as NutritionAssessment['eating_context'],
    what_tried: r.what_tried as NutritionAssessment['what_tried'],
    fasting_protocol:
      (r.fasting_protocol as NutritionAssessment['fasting_protocol']) ??
      'none',
    alcohol_use:
      (r.alcohol_use as NutritionAssessment['alcohol_use']) ?? 'none',
    cannabis_use:
      (r.cannabis_use as NutritionAssessment['cannabis_use']) ?? 'none',
    cheat_day_pattern:
      (r.cheat_day_pattern as NutritionAssessment['cheat_day_pattern']) ??
      null,
    cooking_capacity:
      (r.cooking_capacity as NutritionAssessment['cooking_capacity']) ?? null,
    dietary_pattern:
      (r.dietary_pattern as NutritionAssessment['dietary_pattern']) ?? null,
    meal_service_willingness:
      (r.meal_service_willingness as NutritionAssessment['meal_service_willingness']) ??
      null,
    snacking_style:
      (r.snacking_style as NutritionAssessment['snacking_style']) ?? null,
    gut_sensitivity:
      (r.gut_sensitivity as NutritionAssessment['gut_sensitivity']) ?? 'none',
    food_preferences: (r.food_preferences as string[] | null) ?? [],
    food_exclusions: (r.food_exclusions as string[] | null) ?? [],
    food_filter_text: (r.food_filter_text as string | null) ?? null,
    tdee_estimate: (r.tdee_estimate as number | null) ?? null,
    calorie_target: (r.calorie_target as number | null) ?? null,
    protein_target_g: (r.protein_target_g as number | null) ?? null,
    carb_target_g: (r.carb_target_g as number | null) ?? null,
    fat_target_g: (r.fat_target_g as number | null) ?? null,
    goal_weight_lbs: (r.goal_weight_lbs as number | null) ?? null,
    goal_target_weeks: (r.goal_target_weeks as number | null) ?? null,
    bf_pct_assessment: (r.bf_pct_assessment as number | null) ?? null,
    safe_max_weekly_pct:
      r.safe_max_weekly_pct == null
        ? null
        : Number(r.safe_max_weekly_pct as string | number),
    realistic_target_weeks:
      (r.realistic_target_weeks as number | null) ?? null,
    nutrition_goal_text: (r.nutrition_goal_text as string | null) ?? null,
    last_evaluated_at: (r.last_evaluated_at as string | null) ?? null,
    report_text: (r.report_text as string | null) ?? null,
    report_generated_at: (r.report_generated_at as string | null) ?? null,
    report_model: (r.report_model as string | null) ?? null,
    report_input_modifiers:
      (r.report_input_modifiers as NutritionReportInputModifiers | null) ??
      null,
    created_at: r.created_at as string,
    updated_at: r.updated_at as string,
  };
}
