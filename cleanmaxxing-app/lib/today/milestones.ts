// Day-X milestone detector for the /today hero ribbon. Fires on
// specific days (7, 30, 90, 180) after onboarding, and on the day
// the user does something for the first time (first check-in,
// first goal graduated).
//
// Milestones are *moments*, not durations: a milestone fires only
// on the app-day it's reached, not for the rest of time. This is
// intentional — the felt sense we want is "I'm building something
// real," not "look at this number that doesn't change anymore."
// Skipping a day means you miss that milestone's surface; the
// MonthlyCheckpointCard still picks up the slack on day 30+.
//
// Priority when multiple fire on the same day: first-goal-graduated
// > first-check-in > day-X. The most personally meaningful event
// wins. In practice these almost never collide.

import type { SupabaseClient } from '@supabase/supabase-js';
import { appDayFor, daysBetweenAppDays } from '@/lib/date/app-day';

export type MilestoneKind =
  | 'day-7'
  | 'day-30'
  | 'day-90'
  | 'day-180'
  | 'first-check-in'
  | 'first-goal-graduated';

export type Milestone = {
  kind: MilestoneKind;
  // Short ribbon copy. Pinned to the hero card. Tone: quietly proud,
  // not effusive. No exclamation marks, no emoji.
  ribbonText: string;
};

const DAY_X_RIBBONS: Record<7 | 30 | 90 | 180, string> = {
  7: 'One week in. The shape of the loop is yours now.',
  30: 'Day 30. Your stack is sticking.',
  90: 'Ninety days in. Most people never get here.',
  180: 'Six months. The slow stuff is showing now.',
};

export async function pickMilestone(
  supabase: SupabaseClient,
  userId: string,
  timezone: string,
  daysSinceOnboarding: number,
  now: Date = new Date(),
): Promise<Milestone | null> {
  const todayDay = appDayFor(timezone, now);

  // First-goal-graduated wins when the user just shipped one. We
  // detect "today" via completed_at falling on today's app-day, and
  // "first ever" by counting completed goals — if there's exactly
  // one and it landed today, the moment is now.
  const { data: completedGoals } = await supabase
    .from('goals')
    .select('id, completed_at')
    .eq('user_id', userId)
    .eq('status', 'completed')
    .order('completed_at', { ascending: false })
    .limit(2);
  const completedToday = (completedGoals ?? []).filter((g) => {
    const ts = (g as { completed_at: string | null }).completed_at;
    if (!ts) return false;
    return appDayFor(timezone, new Date(ts)) === todayDay;
  });
  if (completedToday.length > 0 && (completedGoals ?? []).length === 1) {
    return {
      kind: 'first-goal-graduated',
      ribbonText: 'First goal graduated. The work compounds from here.',
    };
  }

  // First-check-in: a check_in row exists for today, and there is
  // exactly one check_in row total for this user. We use a count
  // query (head: true) to keep the wire small.
  const { data: todayCheckIn } = await supabase
    .from('check_ins')
    .select('id, date')
    .eq('user_id', userId)
    .eq('date', todayDay)
    .maybeSingle();
  if (todayCheckIn) {
    const { count } = await supabase
      .from('check_ins')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId);
    if ((count ?? 0) === 1) {
      return {
        kind: 'first-check-in',
        ribbonText: 'Your first check-in is in. That’s the whole loop.',
      };
    }
  }

  // Day-X: only on the exact app-day. daysSinceOnboarding is computed
  // in the page using app-day arithmetic, so equality is correct.
  if (daysSinceOnboarding === 7) {
    return { kind: 'day-7', ribbonText: DAY_X_RIBBONS[7] };
  }
  if (daysSinceOnboarding === 30) {
    return { kind: 'day-30', ribbonText: DAY_X_RIBBONS[30] };
  }
  if (daysSinceOnboarding === 90) {
    return { kind: 'day-90', ribbonText: DAY_X_RIBBONS[90] };
  }
  if (daysSinceOnboarding === 180) {
    return { kind: 'day-180', ribbonText: DAY_X_RIBBONS[180] };
  }

  return null;
}

// Re-exported convenience for tests / debugging — accepts an
// explicit (todayDay, completedAtIso) pair so call sites can verify
// the timezone math without standing up a supabase mock. Not used
// by /today directly.
export function isCompletedToday(
  todayDay: string,
  completedAtIso: string | null,
  timezone: string,
): boolean {
  if (!completedAtIso) return false;
  const day = appDayFor(timezone, new Date(completedAtIso));
  return daysBetweenAppDays(day, todayDay) === 0;
}
