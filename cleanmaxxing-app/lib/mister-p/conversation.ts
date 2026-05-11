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

// Global (unscoped) /today chat keeps a tight 8-pair window — the global
// thread cuts across topics, so longer history pulls in context that
// rarely recurs. Per-thread scopes (journey or goal) run deeper because
// the topic stays stable across turns; 15 pairs gives enough continuity
// for a user returning a week later without blowing the prompt's token
// budget.
const DEFAULT_LIMIT_GLOBAL = 8;
const DEFAULT_LIMIT_PER_THREAD = 15;
const ANSWER_MAX_CHARS = 800;
const QUESTION_MAX_CHARS = 300;

export async function getRecentConversation(
  supabase: SupabaseClient,
  userId: string,
  options: {
    journeySlug?: string | null;
    goalId?: string | null;
    limit?: number;
  } = {},
): Promise<ConversationPair[]> {
  const { journeySlug = null, goalId = null, limit } = options;
  const isScoped = journeySlug !== null || goalId !== null;
  const effectiveLimit =
    limit ?? (isScoped ? DEFAULT_LIMIT_PER_THREAD : DEFAULT_LIMIT_GLOBAL);

  let query = supabase
    .from('mister_p_queries')
    .select('question, answer, created_at')
    .eq('user_id', userId);

  // Scope to the right thread. journey_slug takes precedence (current
  // primary picker); goal_id is the legacy /goals/[id] path. When
  // neither is set, the General thread loads — rows with BOTH
  // scopes null — so scoped histories don't bleed into General.
  if (journeySlug) {
    query = query.eq('journey_slug', journeySlug);
  } else if (goalId) {
    query = query.eq('goal_id', goalId);
  } else {
    query = query.is('journey_slug', null).is('goal_id', null);
  }

  const { data, error } = await query
    .order('created_at', { ascending: false })
    .limit(effectiveLimit);

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
