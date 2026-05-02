// Soft continuity for /today. Counts distinct app-days in the last
// 30 on which the user did *anything* — checked in, logged a
// workout, logged sleep, logged nutrition, or saved a weekly
// reflection. This is deliberately not a streak: streaks are
// punishing and brand-incompatible. "X of the last 30 days" gives
// a felt sense of consistency without rewarding grinding or
// punishing rest.
//
// Eligibility: only surface when the user has at least 7 days of
// onboarding history. Day 1 saying "1 of 1" is noise; day 5 saying
// "3 of 5" anchors expectations on perfection. Past day 7 the ratio
// becomes a meaningful signal regardless of where they fall on it.
//
// "App-day" honors the 3am-local cutoff (lib/date/app-day.ts) so a
// 1am log routes to yesterday's app-day, matching how everything
// else on /today buckets time.

import type { SupabaseClient } from '@supabase/supabase-js';
import { addDaysToAppDay, appDayFor } from '@/lib/date/app-day';

export type ShowUpStat = {
  // Distinct app-days with any activity in the window. 0..total.
  showedUp: number;
  // Window length actually scored against (caps at min(30, daysSinceOnboarding+1)).
  total: number;
  // True only when the window is wide enough to be meaningful.
  // /today should hide the line entirely when false.
  eligible: boolean;
};

const WINDOW_DAYS = 30;
const MIN_DAYS_FOR_ELIGIBILITY = 7;

export async function getShowUpStat(
  supabase: SupabaseClient,
  userId: string,
  timezone: string,
  daysSinceOnboarding: number,
  now: Date = new Date(),
): Promise<ShowUpStat> {
  if (daysSinceOnboarding < MIN_DAYS_FOR_ELIGIBILITY) {
    return { showedUp: 0, total: 0, eligible: false };
  }

  // Window: last `total` app-days inclusive of today. Cap at the
  // user's actual history so a returning user on day 12 isn't
  // measured against 30 days they didn't have.
  const total = Math.min(WINDOW_DAYS, daysSinceOnboarding + 1);
  const endDay = appDayFor(timezone, now);
  const startDay = addDaysToAppDay(endDay, -(total - 1));

  // Sleep is logged by night_of (the date the user went to bed),
  // which on its own is a valid "showed up" signal — we don't need
  // to align it to today's app-day.
  // Weekly reflections are keyed by week_start (Sunday); a single
  // reflection in the window should count as the day it was saved
  // on (created_at), not the entire week. Using created_at >= window
  // start gives that semantics directly.
  const reflectionWindowStart = `${startDay}T00:00:00Z`;

  const [
    { data: checkInRows },
    { data: workoutRows },
    { data: sleepRows },
    { data: nutritionRows },
    { data: reflectionRows },
  ] = await Promise.all([
    supabase
      .from('check_ins')
      .select('date')
      .eq('user_id', userId)
      .gte('date', startDay)
      .lte('date', endDay),
    supabase
      .from('workout_logs')
      .select('performed_on')
      .eq('user_id', userId)
      .gte('performed_on', startDay)
      .lte('performed_on', endDay),
    supabase
      .from('sleep_logs')
      .select('night_of')
      .eq('user_id', userId)
      .gte('night_of', startDay)
      .lte('night_of', endDay),
    supabase
      .from('nutrition_logs')
      .select('date')
      .eq('user_id', userId)
      .gte('date', startDay)
      .lte('date', endDay),
    supabase
      .from('weekly_reflections')
      .select('created_at')
      .eq('user_id', userId)
      .gte('created_at', reflectionWindowStart),
  ]);

  const showedUpDays = new Set<string>();
  for (const r of checkInRows ?? []) {
    const day = (r as { date: string }).date;
    if (day) showedUpDays.add(day);
  }
  for (const r of workoutRows ?? []) {
    const day = (r as { performed_on: string }).performed_on;
    if (day) showedUpDays.add(day);
  }
  for (const r of sleepRows ?? []) {
    const day = (r as { night_of: string }).night_of;
    if (day) showedUpDays.add(day);
  }
  for (const r of nutritionRows ?? []) {
    const day = (r as { date: string }).date;
    if (day) showedUpDays.add(day);
  }
  for (const r of reflectionRows ?? []) {
    const createdAt = (r as { created_at: string }).created_at;
    if (!createdAt) continue;
    const day = appDayFor(timezone, new Date(createdAt));
    if (day >= startDay && day <= endDay) showedUpDays.add(day);
  }

  return { showedUp: showedUpDays.size, total, eligible: true };
}
