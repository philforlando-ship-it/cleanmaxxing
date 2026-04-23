/**
 * Per-user Mister P conversation history loader.
 *
 * Pulls the last N question/answer pairs from `mister_p_queries` so
 * the prompt layer can inject a CONVERSATION HISTORY block. The goal
 * is "do not repeat yourself" — Mister P sees what he's already told
 * this user and, when a topic recurs, goes deeper instead of restating
 * the basics.
 *
 * Answer text is truncated per-pair because a single Mister P response
 * can run 800+ words; we want the gist, not full transcripts.
 */
import type { SupabaseClient } from '@supabase/supabase-js';

export type ConversationPair = {
  question: string;
  answer: string;
  created_at: string;
};

const DEFAULT_LIMIT = 8;
const ANSWER_MAX_CHARS = 800;
const QUESTION_MAX_CHARS = 300;

export async function getRecentConversation(
  supabase: SupabaseClient,
  userId: string,
  limit: number = DEFAULT_LIMIT,
): Promise<ConversationPair[]> {
  const { data, error } = await supabase
    .from('mister_p_queries')
    .select('question, answer, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) return [];

  // Reverse to chronological order (oldest first) so the prompt reads
  // naturally as a conversation log. Truncate per-message to keep the
  // block under control when the user has had long exchanges.
  return (data ?? [])
    .map((r) => {
      const row = r as { question: string; answer: string; created_at: string };
      return {
        question: truncate(row.question, QUESTION_MAX_CHARS),
        answer: truncate(row.answer, ANSWER_MAX_CHARS),
        created_at: row.created_at,
      };
    })
    .reverse();
}

function truncate(text: string, max: number): string {
  if (!text) return '';
  if (text.length <= max) return text;
  return text.slice(0, max).trimEnd() + '\u2026';
}
