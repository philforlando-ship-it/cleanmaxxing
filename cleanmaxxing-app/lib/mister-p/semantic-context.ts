/**
 * Builds a per-user "semantic context blob" for retrieval augmentation.
 *
 * Mister P's standard retrieval uses only the current question's
 * embedding. That misses the background the user has already given the
 * app: the specific_thing free-text from onboarding (or the quarterly
 * re-survey update), and the free-text notes saved alongside recent
 * weekly reflections ("I keep skipping skincare at night — too tired").
 *
 * This helper concatenates those signals into a single text blob the
 * ask route can embed separately and pass into retrieval as a secondary
 * query vector. Keeps the user's stated frustrations surfacing the
 * relevant chunks automatically, without Mister P being told "the user
 * is struggling with evening routines."
 */
import type { SupabaseClient } from '@supabase/supabase-js';

// How many recent weekly_reflections notes to include. Three weeks is
// enough to capture a pattern (the same frustration showing up twice)
// without dragging in stale context from months ago.
const REFLECTION_NOTES_LIMIT = 3;

// Individual-note cap. Reflection notes are free-text so users can
// write anything; a runaway note shouldn't dominate the blob.
const NOTE_MAX_CHARS = 400;

export async function getSemanticContextText(
  supabase: SupabaseClient,
  userId: string,
): Promise<string | null> {
  const parts: string[] = [];

  // specific_thing — quarterly overrides onboarding.
  const { data: specificRows } = await supabase
    .from('survey_responses')
    .select('question_key, response_value')
    .eq('user_id', userId)
    .in('question_key', ['specific_thing', 'specific_thing_q1']);
  const byKey = new Map<string, string>();
  for (const row of specificRows ?? []) {
    const r = row as { question_key: string; response_value: string | null };
    if (r.response_value) byKey.set(r.question_key, r.response_value);
  }
  const specificThing =
    byKey.get('specific_thing_q1') ?? byKey.get('specific_thing') ?? null;
  if (specificThing) parts.push(specificThing);

  // Recent reflection notes.
  const { data: refRows } = await supabase
    .from('weekly_reflections')
    .select('notes, week_start')
    .eq('user_id', userId)
    .not('notes', 'is', null)
    .order('week_start', { ascending: false })
    .limit(REFLECTION_NOTES_LIMIT);

  for (const row of refRows ?? []) {
    const note = (row as { notes: string | null }).notes;
    if (!note) continue;
    const trimmed = note.trim();
    if (trimmed.length === 0) continue;
    parts.push(
      trimmed.length > NOTE_MAX_CHARS
        ? trimmed.slice(0, NOTE_MAX_CHARS).trimEnd() + '\u2026'
        : trimmed,
    );
  }

  if (parts.length === 0) return null;
  return parts.join('\n\n');
}
