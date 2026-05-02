/**
 * Self-acceptance risk detector.
 *
 * Spec §13: appearance work is one leg of the stool, self-acceptance
 * is the second. The library lets users add self-acceptance goals
 * directly, but the more honest version is the app noticing when the
 * appearance system is starting to consume too much attention and
 * surfacing the corrective goal proactively.
 *
 * Patterns detected (not exhaustive — start with the high-signal ones):
 *
 *   over_capacity:        user has 5+ active goals for 7+ days
 *   polish_without_base:  ≥1 tier-3/4/5 active and 0 tier-1 active
 *   circuit_breaker:      a Mister P circuit-breaker chat fired in the
 *                         last 7 days (the topic-loop signal)
 *   abandon_restart:      ≥2 abandon→re-add cycles in the last 30 days
 *
 * Returns an array of fired pattern keys and a flag indicating any
 * signal at all. Used by:
 *   - lib/goals/fit-score: surfaces self-acceptance templates as
 *     recommended-now when any pattern fires (vs. situational).
 *   - /today: a self-acceptance suggestion card mounts when any
 *     pattern fires and the user has no self-acceptance goal active.
 */
import type { SupabaseClient } from '@supabase/supabase-js';

export type RiskPattern =
  | 'over_capacity'
  | 'polish_without_base'
  | 'circuit_breaker'
  | 'abandon_restart';

export type RiskSignals = {
  patterns: RiskPattern[];
  triggered: boolean;
};

const OVER_CAPACITY_GOAL_COUNT = 5;
const OVER_CAPACITY_MIN_DAYS = 7;
const ABANDON_RESTART_THRESHOLD = 2;
const ABANDON_RESTART_WINDOW_DAYS = 30;
const CIRCUIT_BREAKER_WINDOW_DAYS = 7;
const MS_PER_DAY = 86_400_000;

export async function detectRiskSignals(
  supabase: SupabaseClient,
  userId: string,
  now: Date = new Date(),
): Promise<RiskSignals> {
  const patterns: RiskPattern[] = [];

  const { data: activeGoals } = await supabase
    .from('goals')
    .select('priority_tier, created_at, source_slug')
    .eq('user_id', userId)
    .eq('status', 'active');
  const active = (activeGoals ?? []) as Array<{
    priority_tier: string | null;
    created_at: string;
    source_slug: string | null;
  }>;

  // over_capacity — 5+ active goals, oldest one created at least 7
  // days ago. Catches the "loaded the library on day one" pattern
  // where the count is fine for a moment but unsustainable as a
  // standing state.
  if (active.length >= OVER_CAPACITY_GOAL_COUNT) {
    const oldest = active.reduce((min, g) => {
      const t = new Date(g.created_at).getTime();
      return t < min ? t : min;
    }, Number.MAX_SAFE_INTEGER);
    const daysOldest = Math.floor((now.getTime() - oldest) / MS_PER_DAY);
    if (daysOldest >= OVER_CAPACITY_MIN_DAYS) patterns.push('over_capacity');
  }

  // polish_without_base — at least one active refinement/advanced/polish
  // goal AND zero active foundation goals. Inverts the brand position;
  // prompts the corrective surface even before the user has 5 goals.
  const tierCounts = active.reduce(
    (acc, g) => {
      const tier = g.priority_tier ?? 'unknown';
      acc[tier] = (acc[tier] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );
  const foundationActive = tierCounts['tier-1'] ?? 0;
  const refinementOrPolishActive =
    (tierCounts['tier-3'] ?? 0) +
    (tierCounts['tier-4'] ?? 0) +
    (tierCounts['tier-5'] ?? 0);
  if (foundationActive === 0 && refinementOrPolishActive >= 1) {
    patterns.push('polish_without_base');
  }

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

  // abandon_restart — count abandoned goals in the last 30 days; if
  // 2+ have been re-added (same source_slug shows up active again
  // after the abandon), surface the pattern. Approximation: count
  // distinct source_slugs that appear both abandoned recently AND
  // active now.
  const arWindowStart = new Date(
    now.getTime() - ABANDON_RESTART_WINDOW_DAYS * MS_PER_DAY,
  ).toISOString();
  const { data: abandonedRows } = await supabase
    .from('goals')
    .select('source_slug, status, updated_at')
    .eq('user_id', userId)
    .eq('status', 'abandoned')
    .gte('updated_at', arWindowStart);
  const abandonedSlugs = new Set(
    ((abandonedRows ?? []) as Array<{ source_slug: string | null }>)
      .map((r) => r.source_slug)
      .filter((s): s is string => Boolean(s)),
  );
  const activeSlugs = new Set(
    active.map((g) => g.source_slug).filter((s): s is string => Boolean(s)),
  );
  let restartCount = 0;
  for (const slug of abandonedSlugs) {
    if (activeSlugs.has(slug)) restartCount += 1;
  }
  if (restartCount >= ABANDON_RESTART_THRESHOLD) patterns.push('abandon_restart');

  return { patterns, triggered: patterns.length > 0 };
}

// Recommended self-acceptance template per pattern. The /today card
// pre-fills the deep link to the right one rather than dumping the
// user into the library; the brand voice is "here, this one" not
// "here are three options, pick."
export const PATTERN_TEMPLATE_RECOMMENDATION: Record<RiskPattern, string> = {
  over_capacity: '54-when-to-stop',
  polish_without_base: '54-when-to-stop',
  circuit_breaker: '55-limits-self-improvement',
  abandon_restart: '56-identity-beyond-appearance',
};
