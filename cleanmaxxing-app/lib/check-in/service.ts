/**
 * Check-in service.
 *
 * Pre-Sub-ship-B, this file housed the full daily check-in surface
 * (per-goal completion ticks, /api/check-in CRUD, stalest-goal
 * detector). The goals system retired 2026-05-10; the only surviving
 * consumer is the weekly check-in summary read by /today's
 * ProgressVisual. That single function stays for now — it gracefully
 * returns 0/0 when no goals exist and ProgressVisual hides the line
 * accordingly. The function will retire alongside the goals table
 * drop in Tier 3 cleanup.
 *
 * "Today" = the user's app-day in their stored IANA timezone (3am-
 * local cutoff). See lib/date/app-day.ts for the algorithm.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  appDayFor,
  addDaysToAppDay,
  daysBetweenAppDays,
} from '@/lib/date/app-day';

export type WeeklyCheckInSummary = {
  ticked: number;
  possible: number;
  goalCount: number;
};

/**
 * Rolling 7-day check-in totals across the user's currently-active goals.
 *
 * `possible` caps each goal at min(7, days_since_created + 1) so a goal
 * accepted three days ago contributes three slots, not seven. `ticked`
 * counts goal_check_ins.completed=true rows whose parent check_in falls
 * in the same window. Abandoned/completed goals are excluded — this is
 * a "what am I showing up for right now" view, not lifetime stats.
 *
 * With the goals system retired, this function returns 0/0/0 for all
 * users. ProgressVisual hides its check-in line when possible is 0.
 */
export async function getWeeklyCheckInSummary(
  supabase: SupabaseClient,
  userId: string,
  timezone: string,
  now: Date = new Date(),
): Promise<WeeklyCheckInSummary> {
  const endDate = appDayFor(timezone, now);
  const startDate = addDaysToAppDay(endDate, -6);

  const { data: goalRows } = await supabase
    .from('goals')
    .select('id, created_at')
    .eq('user_id', userId)
    .eq('status', 'active');

  const activeGoals = (goalRows ?? []) as Array<{ id: string; created_at: string }>;
  const goalIds = activeGoals.map((g) => g.id);
  const goalCount = goalIds.length;

  let possible = 0;
  for (const g of activeGoals) {
    const goalDay = appDayFor(timezone, new Date(g.created_at));
    const daysSince = daysBetweenAppDays(goalDay, endDate) + 1;
    possible += Math.max(0, Math.min(7, daysSince));
  }

  if (goalCount === 0 || possible === 0) {
    return { ticked: 0, possible, goalCount };
  }

  const { data: checkInRows } = await supabase
    .from('check_ins')
    .select('id')
    .eq('user_id', userId)
    .gte('date', startDate)
    .lte('date', endDate);

  const checkInIds = (checkInRows ?? []).map((c) => c.id as string);
  if (checkInIds.length === 0) {
    return { ticked: 0, possible, goalCount };
  }

  const { data: tickedRows } = await supabase
    .from('goal_check_ins')
    .select('id')
    .in('check_in_id', checkInIds)
    .in('goal_id', goalIds)
    .eq('completed', true);

  return { ticked: (tickedRows ?? []).length, possible, goalCount };
}
