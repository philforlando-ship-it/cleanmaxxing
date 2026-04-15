/**
 * Weekly reflection service helpers.
 *
 * Per spec §2 Feature 2 + §13: confidence is tracked WEEKLY across 3–4
 * contextual dimensions (social, work, physical, appearance), NOT as a
 * daily global self-worth rating. One reflection per user per week,
 * keyed by week_start (the Monday of that week).
 */
import type { SupabaseClient } from '@supabase/supabase-js';

export type ReflectionDimensions = {
  social_confidence: number;
  work_confidence: number;
  physical_confidence: number;
  appearance_confidence: number;
};

export type WeeklyReflection = ReflectionDimensions & {
  week_start: string;
  notes: string | null;
  created_at: string | null;
};

export type WeeklyReflectionState = {
  week_start: string;
  current: WeeklyReflection | null;
  history: WeeklyReflection[];
};

/**
 * Return the Monday (ISO week start) of the week containing `now`, as a
 * YYYY-MM-DD string in the server's local timezone. The reflection lands
 * on Sunday per spec; anchoring `week_start` to Monday means "this week"
 * unambiguously refers to the 7 days ending on the coming Sunday.
 */
export function weekStartString(now: Date = new Date()): string {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const day = d.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  // Shift back to Monday. Sunday (0) → back 6 days; otherwise back (day - 1).
  const diff = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - diff);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

/**
 * Average of the four dimensions. Used by the chart and by any surface
 * that wants a single summary number (weekly email, monthly checkpoint).
 */
export function averageConfidence(r: ReflectionDimensions): number {
  return (
    (r.social_confidence +
      r.work_confidence +
      r.physical_confidence +
      r.appearance_confidence) /
    4
  );
}

function mapRow(row: Record<string, unknown>): WeeklyReflection {
  return {
    week_start: row.week_start as string,
    social_confidence: row.social_confidence as number,
    work_confidence: row.work_confidence as number,
    physical_confidence: row.physical_confidence as number,
    appearance_confidence: row.appearance_confidence as number,
    notes: (row.notes as string | null) ?? null,
    created_at: (row.created_at as string | null) ?? null,
  };
}

/**
 * Load the user's current-week reflection (if any) and the last 12
 * weeks of history for the chart.
 */
export async function getWeeklyReflectionState(
  supabase: SupabaseClient,
  userId: string,
  weekStart: string = weekStartString()
): Promise<WeeklyReflectionState> {
  const { data, error } = await supabase
    .from('weekly_reflections')
    .select(
      'week_start, social_confidence, work_confidence, physical_confidence, appearance_confidence, notes, created_at'
    )
    .eq('user_id', userId)
    .order('week_start', { ascending: false })
    .limit(12);

  if (error) throw error;

  const rows = (data ?? []).map(mapRow);
  const current = rows.find((r) => r.week_start === weekStart) ?? null;
  // History is rendered left→right (oldest first) so reverse the desc query.
  const history = rows.slice().reverse();

  return { week_start: weekStart, current, history };
}

export async function saveWeeklyReflection(
  supabase: SupabaseClient,
  userId: string,
  dims: ReflectionDimensions,
  notes: string | null,
  weekStart: string = weekStartString()
): Promise<WeeklyReflectionState> {
  // Upsert on (user_id, week_start) — both are constrained unique in the
  // 0001 migration, so this update-on-conflict is safe.
  const { error } = await supabase
    .from('weekly_reflections')
    .upsert(
      {
        user_id: userId,
        week_start: weekStart,
        social_confidence: dims.social_confidence,
        work_confidence: dims.work_confidence,
        physical_confidence: dims.physical_confidence,
        appearance_confidence: dims.appearance_confidence,
        notes: notes,
      },
      { onConflict: 'user_id,week_start' }
    );

  if (error) throw error;

  return getWeeklyReflectionState(supabase, userId, weekStart);
}
