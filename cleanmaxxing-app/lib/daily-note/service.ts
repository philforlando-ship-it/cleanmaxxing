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
// could race the insert — the unique (user_id, day) constraint
// catches the duplicate, and we re-select to return the winning
// row. Cheap to do because both branches are bounded queries.
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
    .insert({
      user_id: userId,
      day,
      template_key: note.key,
      observation: note.observation,
      question: note.question,
    })
    .select(
      'id, day, template_key, observation, question, response, responded_at',
    )
    .single();

  if (error) {
    // Race: another tab inserted the same (user_id, day) row.
    // Re-fetch and return that one.
    const winner = await getTodayNote(supabase, userId, day);
    if (winner) return winner;
    throw error;
  }
  return data as DailyNoteRow;
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
