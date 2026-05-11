/**
 * Self-acceptance risk detector.
 *
 * Spec §13: appearance work is one leg of the stool, self-acceptance
 * is the second. The app notices when the appearance system is
 * starting to consume too much attention and surfaces a corrective
 * nudge proactively.
 *
 * Patterns detected (post-Tier-3 cleanup, 2026-05-10):
 *
 *   circuit_breaker: a Mister P circuit-breaker chat fired in the
 *                    last 7 days (the topic-loop signal)
 *
 * Pre-Tier-3 the detector also fired on goals-table state
 * (over_capacity / polish_without_base / abandon_restart). Those
 * three patterns retired when the goals system was retired — there
 * are no goals to count. circuit_breaker is the only pattern that
 * still has live signal because it reads from mister_p_queries.
 *
 * The /reflection self-acceptance nudge card stays alive driven by
 * this single detector. Future work: rebuild a journey-based
 * over-capacity signal (e.g., 5+ active focus areas for 7+ days)
 * if the broader detection coverage proves valuable.
 */
import type { SupabaseClient } from '@supabase/supabase-js';

export type RiskPattern = 'circuit_breaker';

export type RiskSignals = {
  patterns: RiskPattern[];
  triggered: boolean;
};

const CIRCUIT_BREAKER_WINDOW_DAYS = 7;
const MS_PER_DAY = 86_400_000;

export async function detectRiskSignals(
  supabase: SupabaseClient,
  userId: string,
  now: Date = new Date(),
): Promise<RiskSignals> {
  const patterns: RiskPattern[] = [];

  // circuit_breaker — a Mister P answer in the last 7 days fired with
  // the §13 circuit-breaker advisory (5+ similar questions about the
  // same topic). The advisory text in the answer is the cleanest
  // signal we have without adding a flag column. Falls back silently
  // if the table or shape changes.
  const cbWindowStart = new Date(
    now.getTime() - CIRCUIT_BREAKER_WINDOW_DAYS * MS_PER_DAY,
  ).toISOString();
  const { data: cbRows } = await supabase
    .from('mister_p_queries')
    .select('answer')
    .eq('user_id', userId)
    .gte('created_at', cbWindowStart)
    .ilike('answer', '%fifth time you%')
    .limit(1);
  if ((cbRows ?? []).length > 0) patterns.push('circuit_breaker');

  return { patterns, triggered: patterns.length > 0 };
}

// Recommended self-acceptance POV per pattern. The /reflection nudge
// card pre-fills the deep link to the right one.
export const PATTERN_TEMPLATE_RECOMMENDATION: Record<RiskPattern, string> = {
  circuit_breaker: '55-limits-self-improvement',
};

// Inlined nudge titles keyed by POV slug. Pre-Tier-3 these came from
// content/goal-templates.ts via templateBySlug(); the templates table
// retired with the goals system on 2026-05-10. When a POV slug
// renames, update here.
const PATTERN_TITLE: Record<RiskPattern, string> = {
  circuit_breaker: 'Accept the limits of self-improvement',
};

// Voice-matched intro line per pattern. Kept short — the card
// closes with a generic call to action, so the per-pattern line
// only needs to name what was noticed.
export const PATTERN_INTRO: Record<RiskPattern, string> = {
  circuit_breaker:
    "I've noticed the same topic keep cycling through your chats this week.",
};

export type SelfAcceptanceNudge = {
  pattern: RiskPattern;
  intro: string;
  recommendedSlug: string;
  recommendedTitle: string;
};

export async function pickSelfAcceptanceNudge(
  supabase: SupabaseClient,
  userId: string,
  now: Date = new Date(),
): Promise<SelfAcceptanceNudge | null> {
  const signals = await detectRiskSignals(supabase, userId, now);
  if (!signals.triggered) return null;

  const winner = signals.patterns[0];
  if (!winner) return null;

  return {
    pattern: winner,
    intro: PATTERN_INTRO[winner],
    recommendedSlug: PATTERN_TEMPLATE_RECOMMENDATION[winner],
    recommendedTitle: PATTERN_TITLE[winner],
  };
}
