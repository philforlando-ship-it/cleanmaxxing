/**
 * Daily check-in service helpers.
 *
 * Per spec §2 Feature 2 + §13: daily check-ins are goal-completion checkboxes
 * only — no confidence score, no self-worth slider. Confidence lives in the
 * weekly reflection. One check_in row per user per day, one goal_check_in
 * row per active goal tied to that check_in.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { plainLanguageFor } from '@/lib/content/plain-language';

export type CheckInGoal = {
  goal_id: string;
  title: string;
  description: string | null;
  source_slug: string | null;
  plain_language: string | null;
  completed: boolean;
};

export type TodayCheckInState = {
  date: string; // YYYY-MM-DD, server-local
  check_in_id: string | null; // null if user hasn't checked in today yet
  goals: CheckInGoal[];
};

/**
 * Return today's date in YYYY-MM-DD in the server's local timezone.
 * The `date` column in check_ins is a Postgres `date` so we pass a bare
 * date string, not a timestamp.
 */
export function todayDateString(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Load today's check-in state for the given user: active goals + whether
 * each has been completed yet today. Safe to call whether or not the user
 * has checked in.
 */
export async function getTodayCheckInState(
  supabase: SupabaseClient,
  userId: string,
  date: string = todayDateString()
): Promise<TodayCheckInState> {
  const { data: goals, error: goalsError } = await supabase
    .from('goals')
    .select('id, title, description, source_slug')
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

  let completedByGoal = new Map<string, boolean>();
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
      return {
        goal_id: g.id as string,
        title: g.title as string,
        description: (g.description as string | null) ?? null,
        source_slug: slug,
        plain_language: slug ? plainLanguageFor(slug) : null,
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
  date: string = todayDateString()
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

  return getTodayCheckInState(supabase, userId, date);
}

/**
 * Undo today's check-in: delete the check_in row (cascades to goal_check_ins).
 * Used when the user wants to re-enter their check-in for the day.
 */
export async function undoTodayCheckIn(
  supabase: SupabaseClient,
  userId: string,
  date: string = todayDateString()
): Promise<void> {
  await supabase
    .from('check_ins')
    .delete()
    .eq('user_id', userId)
    .eq('date', date);
}
