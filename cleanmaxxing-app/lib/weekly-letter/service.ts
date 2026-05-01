/**
 * Weekly letter service: read path for /today.
 *
 * The Sunday cron at /api/cron/weekly-letter writes one row per
 * user per week. /today calls getCurrentWeeklyLetter to render
 * the card; the letter persists from Sunday through the next
 * Sunday's regeneration. We cap freshness at MAX_AGE_DAYS so a
 * stale letter (cron failure, returning user) doesn't keep
 * surfacing months later.
 */
import type { SupabaseClient } from '@supabase/supabase-js';

export type WeeklyLetter = {
  id: string;
  week_start: string;
  body: string;
  created_at: string;
};

// Anchor every letter to the Sunday on or before `date`. The cron
// runs Sunday morning UTC; users opening /today on Saturday still
// see the prior Sunday's letter, which is the intent.
const MS_PER_DAY = 86_400_000;
const MAX_AGE_DAYS = 8;

export function weekStartIso(date: Date): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay());
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

export async function getCurrentWeeklyLetter(
  supabase: SupabaseClient,
  userId: string,
  now: Date = new Date(),
): Promise<WeeklyLetter | null> {
  const { data } = await supabase
    .from('weekly_letters')
    .select('id, week_start, body, created_at')
    .eq('user_id', userId)
    .order('week_start', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  const row = data as WeeklyLetter;
  const ageDays = Math.floor(
    (now.getTime() - new Date(row.week_start + 'T00:00:00').getTime()) / MS_PER_DAY,
  );
  if (ageDays > MAX_AGE_DAYS) return null;
  return row;
}
