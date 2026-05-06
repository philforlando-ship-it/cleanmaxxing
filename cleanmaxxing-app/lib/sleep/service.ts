// Server-side helpers for the sleep tracker AND the sleep
// assessment / plan layer. The tracker reads recent sleep_logs rows
// (getSleepState below) for /today's card hydration and Mister P's
// user-state calibration. The assessment layer (further down) does
// CRUD on sleep_assessments — same Pattern A shape as hair / style /
// facial_hair.

import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  SleepAssessment,
  SleepAssessmentInput,
  SleepReportInputModifiers,
} from './types';

export type SleepLog = {
  night_of: string; // YYYY-MM-DD
  hours: number;
  quality_1_5: number | null;
  notes: string | null;
  // 'manual' for user-entered, otherwise the wearable provider slug
  // (e.g. 'whoop', 'oura'). Used by the /today sleep card to render
  // a "via [Provider]" tag when the row was auto-filled.
  source: string;
};

export type SleepState = {
  // Most-recent 14 logs, oldest first (for chart rendering /
  // history display). Trimmed to 14 because trends beyond two
  // weeks belong on /profile, not /today.
  recent: SleepLog[];
  // Average hours over the last 7 *logged* nights. Null when no
  // logs exist; the prompt-side fallback to user_profile's
  // self-report covers that case.
  rollingAvgHours: number | null;
  rollingAvgQuality: number | null;
  // Number of logs included in the rolling averages (max 7). Lets
  // Mister P's prompt distinguish a confident signal from a
  // sparse one.
  rollingCount: number;
};

const RECENT_LIMIT = 14;
const ROLLING_WINDOW = 7;

export async function getSleepState(
  supabase: SupabaseClient,
  userId: string,
): Promise<SleepState> {
  const { data, error } = await supabase
    .from('sleep_logs')
    .select('night_of, hours, quality_1_5, notes, source')
    .eq('user_id', userId)
    .order('night_of', { ascending: false })
    .limit(RECENT_LIMIT);

  if (error) {
    return {
      recent: [],
      rollingAvgHours: null,
      rollingAvgQuality: null,
      rollingCount: 0,
    };
  }

  const rows = (data ?? []).map((r) => {
    const row = r as {
      night_of: string;
      hours: number | string;
      quality_1_5: number | null;
      notes: string | null;
      source: string | null;
    };
    return {
      night_of: row.night_of,
      hours: typeof row.hours === 'string' ? Number(row.hours) : row.hours,
      quality_1_5: row.quality_1_5,
      notes: row.notes,
      source: row.source ?? 'manual',
    };
  });

  const window = rows.slice(0, ROLLING_WINDOW);
  const rollingCount = window.length;
  const rollingAvgHours =
    rollingCount > 0
      ? Math.round(
          (window.reduce((s, r) => s + r.hours, 0) / rollingCount) * 10,
        ) / 10
      : null;
  const qualities = window
    .map((r) => r.quality_1_5)
    .filter((q): q is number => q !== null);
  const rollingAvgQuality =
    qualities.length > 0
      ? Math.round((qualities.reduce((s, q) => s + q, 0) / qualities.length) * 10) /
        10
      : null;

  return {
    recent: rows.reverse(), // oldest first for the UI
    rollingAvgHours,
    rollingAvgQuality,
    rollingCount,
  };
}

// ===========================================================
// Sleep assessment / plan (Pattern A v0)
// ===========================================================

export async function getSleepAssessment(
  supabase: SupabaseClient,
  userId: string,
): Promise<SleepAssessment | null> {
  const { data, error } = await supabase
    .from('sleep_assessments')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return rowToAssessment(data);
}

export async function hasSleepAssessment(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ hasAssessment: boolean; hasReport: boolean }> {
  const { data, error } = await supabase
    .from('sleep_assessments')
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

export async function saveSleepAssessment(
  supabase: SupabaseClient,
  userId: string,
  input: SleepAssessmentInput,
): Promise<SleepAssessment> {
  const row = {
    user_id: userId,
    primary_concerns: input.primary_concerns,
    biggest_blockers: input.biggest_blockers,
    schedule_consistency: input.schedule_consistency,
    what_tried: input.what_tried,
    sleep_goal_text: input.sleep_goal_text,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('sleep_assessments')
    .upsert(row, { onConflict: 'user_id' })
    .select('*')
    .single();
  if (error) throw error;
  return rowToAssessment(data);
}

export async function saveSleepReport(
  supabase: SupabaseClient,
  userId: string,
  args: {
    report_text: string;
    report_model: string;
    report_input_modifiers: SleepReportInputModifiers;
  },
): Promise<void> {
  const { error } = await supabase
    .from('sleep_assessments')
    .update({
      report_text: args.report_text,
      report_generated_at: new Date().toISOString(),
      report_input_modifiers: args.report_input_modifiers,
      report_model: args.report_model,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);
  if (error) throw error;
}

function rowToAssessment(row: unknown): SleepAssessment {
  const r = row as Record<string, unknown>;
  return {
    user_id: r.user_id as string,
    primary_concerns:
      (r.primary_concerns as SleepAssessment['primary_concerns']) ?? [],
    biggest_blockers:
      (r.biggest_blockers as SleepAssessment['biggest_blockers']) ?? [],
    schedule_consistency:
      r.schedule_consistency as SleepAssessment['schedule_consistency'],
    what_tried: (r.what_tried as SleepAssessment['what_tried']) ?? [],
    sleep_goal_text: (r.sleep_goal_text as string | null) ?? null,
    otc_supplements_considered_at:
      (r.otc_supplements_considered_at as string | null) ?? null,
    apnea_screening_surfaced_at:
      (r.apnea_screening_surfaced_at as string | null) ?? null,
    report_text: (r.report_text as string | null) ?? null,
    report_generated_at: (r.report_generated_at as string | null) ?? null,
    report_model: (r.report_model as string | null) ?? null,
    report_input_modifiers:
      (r.report_input_modifiers as SleepReportInputModifiers | null) ?? null,
    created_at: r.created_at as string,
    updated_at: r.updated_at as string,
  };
}
