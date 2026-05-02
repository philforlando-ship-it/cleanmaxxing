// Server-side helpers for the nutrition tracker. Mirrors the
// sleep/workout services in shape so the card-level patterns line
// up. "Today" routes through the user's app-day (3am-local cutoff
// via lib/date/app-day.ts), the same boundary the rest of /today
// honors.
//
// Intentionally small: hit/miss + optional grams. We don't store a
// per-user target — the brand position is that the user knows
// their number (0.8–0.9 g/lb body weight per content) and the log
// is about felt-sense compliance, not surveillance. A future macro
// tracker is its own product.

import type { SupabaseClient } from '@supabase/supabase-js';
import { addDaysToAppDay, appDayFor } from '@/lib/date/app-day';

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
