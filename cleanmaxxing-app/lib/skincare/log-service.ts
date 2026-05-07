// Server-side helpers for the skincare daily SPF log. Mirrors
// lib/nutrition/service.ts shape: today's row + recent window +
// hit-rate over the last 7 logged days. Quiet context for the
// /today card — no streaks, no scoring.

import type { SupabaseClient } from '@supabase/supabase-js';
import { addDaysToAppDay, appDayFor } from '@/lib/date/app-day';

export type SkincareLog = {
  date: string; // YYYY-MM-DD app-day
  applied_spf: boolean;
  notes: string | null;
};

export type SkincareLogState = {
  today: SkincareLog | null;
  recent: SkincareLog[];
  hitLast7: number;
  loggedLast7: number;
};

const RECENT_LIMIT = 14;
const ROLLING_WINDOW = 7;

export async function getSkincareLogState(
  supabase: SupabaseClient,
  userId: string,
  timezone: string,
  now: Date = new Date(),
): Promise<SkincareLogState> {
  const today = appDayFor(timezone, now);
  const windowStart = addDaysToAppDay(today, -(ROLLING_WINDOW - 1));

  const { data, error } = await supabase
    .from('skincare_logs')
    .select('date, applied_spf, notes')
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .limit(RECENT_LIMIT);

  if (error) {
    return { today: null, recent: [], hitLast7: 0, loggedLast7: 0 };
  }

  const rows: SkincareLog[] = (data ?? []).map((r) => {
    const row = r as {
      date: string;
      applied_spf: boolean;
      notes: string | null;
    };
    return {
      date: row.date,
      applied_spf: row.applied_spf,
      notes: row.notes,
    };
  });

  const todayRow = rows.find((r) => r.date === today) ?? null;
  const inWindow = rows.filter(
    (r) => r.date >= windowStart && r.date <= today,
  );
  const hitLast7 = inWindow.filter((r) => r.applied_spf).length;

  return {
    today: todayRow,
    recent: rows.slice().reverse(),
    hitLast7,
    loggedLast7: inWindow.length,
  };
}
