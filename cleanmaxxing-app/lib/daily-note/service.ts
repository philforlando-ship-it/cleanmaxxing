// Daily-note service: get-or-create today's note, save the
// user's response. The "day" is whatever date the caller passes
// (computed from browser-local time on the page) so the note
// rolls over at the user's local midnight rather than the
// server's. Falls back to UTC when the caller doesn't supply
// one — better to show a slightly mistimed note than to drop
// the surface entirely.

import type { SupabaseClient } from '@supabase/supabase-js';
import { selectDailyNote, type SelectorState } from './templates';

export type DailyNoteRow = {
  id: string;
  day: string;
  template_key: string;
  observation: string;
  question: string;
  response: string | null;
  responded_at: string | null;
};

export async function getTodayNote(
  supabase: SupabaseClient,
  userId: string,
  day: string,
): Promise<DailyNoteRow | null> {
  const { data, error } = await supabase
    .from('daily_notes')
    .select(
      'id, day, template_key, observation, question, response, responded_at',
    )
    .eq('user_id', userId)
    .eq('day', day)
    .maybeSingle();
  if (error) return null;
  return (data as DailyNoteRow | null) ?? null;
}

// Look up today's note; if absent, run the selector and write a
// new row. Concurrent calls from the same user on the same day
// could race — handled via upsert with ignoreDuplicates so Postgres
// does ON CONFLICT DO NOTHING (no 23505 error raised). The lost-race
// branch re-fetches the winning row.
//
// Refactored 2026-05-08 from .insert() + try/catch on 23505 to
// .upsert(... ignoreDuplicates) — functionally identical, but the
// supabase client no longer logs the unique-constraint violation
// when two parallel /today renders both reach the write step.
export async function getOrCreateTodayNote(
  supabase: SupabaseClient,
  userId: string,
  day: string,
  state: SelectorState,
): Promise<DailyNoteRow> {
  const existing = await getTodayNote(supabase, userId, day);
  if (existing) return existing;

  const note = selectDailyNote(state);
  const { data, error } = await supabase
    .from('daily_notes')
    .upsert(
      {
        user_id: userId,
        day,
        template_key: note.key,
        observation: note.observation,
        question: note.question,
      },
      { onConflict: 'user_id,day', ignoreDuplicates: true },
    )
    .select(
      'id, day, template_key, observation, question, response, responded_at',
    )
    .maybeSingle();

  if (error) throw error;
  if (data) return data as DailyNoteRow;

  // Lost the race — another concurrent call inserted first. Re-fetch
  // and return that row. ignoreDuplicates=true means our upsert was a
  // silent no-op when the row already existed.
  const winner = await getTodayNote(supabase, userId, day);
  if (winner) return winner;
  throw new Error(
    'getOrCreateTodayNote: upsert returned no row AND re-fetch found nothing — should be impossible',
  );
}

export async function getRecentResponses(
  supabase: SupabaseClient,
  userId: string,
  limit = 3,
): Promise<Array<{ day: string; question: string; response: string }>> {
  const { data } = await supabase
    .from('daily_notes')
    .select('day, question, response')
    .eq('user_id', userId)
    .not('response', 'is', null)
    .order('responded_at', { ascending: false })
    .limit(limit);
  return ((data ?? []) as Array<{
    day: string;
    question: string;
    response: string | null;
  }>)
    .filter((r): r is { day: string; question: string; response: string } =>
      Boolean(r.response),
    )
    .reverse();
}
