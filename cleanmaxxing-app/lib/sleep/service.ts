// Server-side helpers for the sleep tracker. Reads recent
// sleep_logs rows for /today's card hydration and Mister P's
// user-state calibration. The recent average is computed over
// the last N logged nights (not a calendar window) so the metric
// is well-defined regardless of how often the user logs and
// regardless of their timezone — the server doesn't need to
// know what "this week" means in user-local time.

import type { SupabaseClient } from '@supabase/supabase-js';

export type SleepLog = {
  night_of: string; // YYYY-MM-DD
  hours: number;
  quality_1_5: number | null;
  notes: string | null;
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
    .select('night_of, hours, quality_1_5, notes')
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
    };
    return {
      night_of: row.night_of,
      hours: typeof row.hours === 'string' ? Number(row.hours) : row.hours,
      quality_1_5: row.quality_1_5,
      notes: row.notes,
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
