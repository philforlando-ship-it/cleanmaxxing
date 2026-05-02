/**
 * Daily check-in service helpers.
 *
 * Per spec §2 Feature 2 + §13: daily check-ins are goal-completion checkboxes
 * only — no confidence score, no self-worth slider. Confidence lives in the
 * weekly reflection. One check_in row per user per day, one goal_check_in
 * row per active goal tied to that check_in.
 *
 * "Today" = the user's app-day in their stored IANA timezone (3am-local
 * cutoff). All public functions accept `timezone` so callers can route the
 * day-key without re-querying users.timezone themselves. See
 * lib/date/app-day.ts for the algorithm.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { plainLanguageFor } from '@/lib/content/plain-language';
import { templateBySlug } from '@/content/goal-templates';
import type { MeasurementType } from '@/content/goal-templates';
import {
  appDayFor,
  addDaysToAppDay,
  daysBetweenAppDays,
} from '@/lib/date/app-day';

export type CheckInGoal = {
  goal_id: string;
  title: string;
  source_slug: string | null;
  plain_language: string | null;
  // How this goal's progress is actually proven (session log, photo
  // comparison, macro tracking, etc.). Pulled from the anchored
  // template at render time. Drives the contextual action affordance
  // surfaced next to the daily tick in the UI. Null when the user's
  // goal anchors to a slug we don't have a template for (custom
  // goals or stale-anchor goals).
  measurement_type: MeasurementType | null;
  completed: boolean;
};

export type TodayCheckInState = {
  date: string; // YYYY-MM-DD, the user's app-day key
  check_in_id: string | null; // null if user hasn't checked in today yet
  goals: CheckInGoal[];
};

/**
 * Load today's check-in state for the given user: active goals + whether
 * each has been completed yet today. Safe to call whether or not the user
 * has checked in.
 */
export async function getTodayCheckInState(
  supabase: SupabaseClient,
  userId: string,
  timezone: string,
  date: string = appDayFor(timezone),
): Promise<TodayCheckInState> {
  const { data: goals, error: goalsError } = await supabase
    .from('goals')
    .select('id, title, source_slug')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('created_at', { ascending: true });

  if (goalsError) throw goalsError;

  const { data: checkIn } = await supabase
    .from('check_ins')
    .select('id')
    .eq('user_id', userId)
    .eq('date', date)
    .maybeSingle();

  const completedByGoal = new Map<string, boolean>();
  if (checkIn) {
    const { data: goalCheckIns } = await supabase
      .from('goal_check_ins')
      .select('goal_id, completed')
      .eq('check_in_id', checkIn.id);
    for (const row of goalCheckIns ?? []) {
      completedByGoal.set(row.goal_id as string, Boolean(row.completed));
    }
  }

  return {
    date,
    check_in_id: checkIn?.id ?? null,
    goals: (goals ?? []).map((g) => {
      const slug = (g.source_slug as string | null) ?? null;
      const tmpl = slug ? templateBySlug(slug) : null;
      return {
        goal_id: g.id as string,
        title: g.title as string,
        source_slug: slug,
        plain_language: slug ? plainLanguageFor(slug) : null,
        measurement_type: tmpl?.measurement_type ?? null,
        completed: completedByGoal.get(g.id as string) ?? false,
      };
    }),
  };
}

/**
 * Save (upsert) today's check-in. Creates the parent check_in row if it
 * doesn't exist, then upserts one goal_check_in row per goal the client
 * sent. Goals not present in the payload are not touched — the client is
 * expected to send the full list.
 *
 * Returns the refreshed state.
 */
export async function saveTodayCheckIn(
  supabase: SupabaseClient,
  userId: string,
  completions: Array<{ goal_id: string; completed: boolean }>,
  timezone: string,
  date: string = appDayFor(timezone),
): Promise<TodayCheckInState> {
  // Validate that every goal_id actually belongs to this user and is
  // currently active. Prevents a client from writing goal_check_ins against
  // a goal owned by someone else (RLS would catch it too, but belt-and-
  // suspenders at the service layer is cheap).
  const { data: ownedGoals, error: ownedError } = await supabase
    .from('goals')
    .select('id')
    .eq('user_id', userId)
    .eq('status', 'active');
  if (ownedError) throw ownedError;
  const ownedSet = new Set((ownedGoals ?? []).map((g) => g.id as string));
  const filtered = completions.filter((c) => ownedSet.has(c.goal_id));

  // Upsert parent check_in.
  const { data: existing } = await supabase
    .from('check_ins')
    .select('id')
    .eq('user_id', userId)
    .eq('date', date)
    .maybeSingle();

  let checkInId: string;
  if (existing) {
    checkInId = existing.id as string;
  } else {
    const { data: created, error: createError } = await supabase
      .from('check_ins')
      .insert({ user_id: userId, date })
      .select('id')
      .single();
    if (createError) throw createError;
    checkInId = created.id as string;
  }

  // Clear prior goal_check_ins for this check_in so a re-save reflects the
  // client's current state without merging stale rows.
  await supabase.from('goal_check_ins').delete().eq('check_in_id', checkInId);

  if (filtered.length > 0) {
    const rows = filtered.map((c) => ({
      check_in_id: checkInId,
      goal_id: c.goal_id,
      completed: c.completed,
    }));
    const { error: insertError } = await supabase
      .from('goal_check_ins')
      .insert(rows);
    if (insertError) throw insertError;
  }

  return getTodayCheckInState(supabase, userId, timezone, date);
}

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

export type GoalWeeklySummary = {
  daysCompleted: number;
  daysPossible: number;
};

/**
 * Per-goal rolling 7-day completion count. `daysPossible` is capped by the
 * goal's age so a goal accepted two days ago reads "1 of the last 2 days"
 * instead of "1 of the last 7."
 */
export async function getGoalWeeklySummary(
  supabase: SupabaseClient,
  userId: string,
  goalId: string,
  createdAt: string,
  timezone: string,
  now: Date = new Date(),
): Promise<GoalWeeklySummary> {
  const endDate = appDayFor(timezone, now);
  const startDate = addDaysToAppDay(endDate, -6);

  const goalDay = appDayFor(timezone, new Date(createdAt));
  const daysSince = daysBetweenAppDays(goalDay, endDate) + 1;
  const daysPossible = Math.max(0, Math.min(7, daysSince));

  if (daysPossible === 0) return { daysCompleted: 0, daysPossible: 0 };

  const { data: checkInRows } = await supabase
    .from('check_ins')
    .select('id')
    .eq('user_id', userId)
    .gte('date', startDate)
    .lte('date', endDate);

  const checkInIds = (checkInRows ?? []).map((c) => c.id as string);
  if (checkInIds.length === 0) return { daysCompleted: 0, daysPossible };

  const { data: tickedRows } = await supabase
    .from('goal_check_ins')
    .select('id')
    .in('check_in_id', checkInIds)
    .eq('goal_id', goalId)
    .eq('completed', true);

  return { daysCompleted: (tickedRows ?? []).length, daysPossible };
}

export type StaleGoal = {
  goal_id: string;
  title: string;
  daysSinceLastTick: number | null; // null when the goal has never been ticked
};

/**
 * Identify the single most-stale active goal that warrants a re-entry
 * nudge on /today. Scoped so users see at most one nudge at a time (a
 * list of stale goals reads as nagging; one contextual prompt reads as
 * awareness).
 *
 * Rules:
 *   - Goals younger than `graceDays` (default 14) are always fresh —
 *     onboarding + baseline calibration deserves space before we nudge.
 *   - A goal is "stale" when its most-recent completed goal_check_in
 *     is older than `staleDays` (default 9), OR when the goal has
 *     never been ticked and its age exceeds `graceDays`.
 *   - Tie-break: pick the goal with the oldest last-tick date (or
 *     oldest created_at when never ticked). Surfaces the one the user
 *     has drifted furthest from.
 *
 * Returns null when nothing qualifies — the nudge card is then absent
 * from /today entirely.
 */
export async function getStalestGoal(
  supabase: SupabaseClient,
  userId: string,
  timezone: string,
  now: Date = new Date(),
  staleDays = 9,
  graceDays = 14,
): Promise<StaleGoal | null> {
  const { data: goalsRaw } = await supabase
    .from('goals')
    .select('id, title, created_at')
    .eq('user_id', userId)
    .eq('status', 'active');
  const goals = (goalsRaw ?? []) as Array<{
    id: string;
    title: string;
    created_at: string;
  }>;
  if (goals.length === 0) return null;

  const todayDay = appDayFor(timezone, now);

  // Filter to goals past the grace window. Younger goals never trigger.
  const eligible = goals.filter((g) => {
    const goalDay = appDayFor(timezone, new Date(g.created_at));
    const age = daysBetweenAppDays(goalDay, todayDay);
    return age >= graceDays;
  });
  if (eligible.length === 0) return null;

  // Pull the most recent completed goal_check_in per eligible goal via
  // a single join query. RLS scopes goal_check_ins through check_ins.user_id
  // so we don't need to filter by user_id here.
  const goalIds = eligible.map((g) => g.id);
  const { data: tickRowsRaw } = await supabase
    .from('goal_check_ins')
    .select('goal_id, check_ins!inner(date)')
    .in('goal_id', goalIds)
    .eq('completed', true)
    .order('check_ins(date)', { ascending: false });

  // Reduce to latest tick date per goal. rows come sorted desc so the
  // first hit per goal wins.
  const latestTickByGoal = new Map<string, string>();
  for (const row of tickRowsRaw ?? []) {
    const r = row as { goal_id: string; check_ins: { date: string } | { date: string }[] };
    // Supabase's embed return shape varies (object vs array) depending
    // on FK cardinality inference. Normalise to the single date string.
    const dateField = Array.isArray(r.check_ins)
      ? r.check_ins[0]?.date
      : r.check_ins?.date;
    if (!dateField) continue;
    if (!latestTickByGoal.has(r.goal_id)) {
      latestTickByGoal.set(r.goal_id, dateField);
    }
  }

  // Score each eligible goal. A goal qualifies as stale when either:
  //   (a) it's never been ticked AND age > graceDays (already enforced), or
  //   (b) last tick was more than staleDays ago.
  let winner: {
    goal_id: string;
    title: string;
    daysSinceLastTick: number | null;
    sortKey: number;
  } | null = null;

  for (const g of eligible) {
    const lastTick = latestTickByGoal.get(g.id);
    let daysSinceLastTick: number | null;
    let sortKey: number; // higher = staler; we pick max

    if (!lastTick) {
      daysSinceLastTick = null;
      // Never ticked: treat as "days since creation" for staleness ranking
      // but cap so a very old never-ticked goal doesn't dominate every
      // tie-break. Age already cleared graceDays.
      const goalDay = appDayFor(timezone, new Date(g.created_at));
      sortKey = daysBetweenAppDays(goalDay, todayDay);
    } else {
      // `lastTick` is YYYY-MM-DD; compute distance in app-days against
      // today's app-day directly (no midnight-local fudge needed).
      daysSinceLastTick = daysBetweenAppDays(lastTick, todayDay);
      if (daysSinceLastTick < staleDays) continue; // still fresh
      sortKey = daysSinceLastTick;
    }

    if (!winner || sortKey > winner.sortKey) {
      winner = {
        goal_id: g.id,
        title: g.title,
        daysSinceLastTick,
        sortKey,
      };
    }
  }

  if (!winner) return null;
  return {
    goal_id: winner.goal_id,
    title: winner.title,
    daysSinceLastTick: winner.daysSinceLastTick,
  };
}

/**
 * Undo today's check-in: delete the check_in row (cascades to goal_check_ins).
 * Used when the user wants to re-enter their check-in for the day.
 */
export async function undoTodayCheckIn(
  supabase: SupabaseClient,
  userId: string,
  timezone: string,
  date: string = appDayFor(timezone),
): Promise<void> {
  await supabase
    .from('check_ins')
    .delete()
    .eq('user_id', userId)
    .eq('date', date);
}
