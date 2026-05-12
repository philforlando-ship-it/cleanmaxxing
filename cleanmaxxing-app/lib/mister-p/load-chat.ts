// Shared loader for the Mister P chat-card surface. Builds the
// journey-picker list + hydrates per-thread message history so the
// chat card mounts with full continuity.
//
// Used by both /today (where the chat sits embedded among other
// tiles) and /chat (the dedicated focused chat surface added when
// /today#mister-p felt like "you got dumped back on /today" — the
// CTAs from /photos and the escape hatch now land here instead).
//
// The shape mirrors what app/(app)/today/page.tsx builds inline
// (lines ~643–698 as of 2026-05-11); pulling it into a helper means
// both surfaces stay aligned without duplicate query logic.

import type { SupabaseClient } from '@supabase/supabase-js';
import { sortJourneys } from '@/lib/today/journeys';
import type { ChatMessage, JourneyOption } from '@/app/(app)/today/mister-p-chat-card';

// Sentinel key for the unscoped "General" thread. Must match the
// constant defined inside mister-p-chat-card.tsx — journey slugs can
// never collide with this.
export const GENERAL_KEY = '__general__';

export type ChatBootstrap = {
  journeys: JourneyOption[];
  initialThreads: Record<string, ChatMessage[]>;
};

export async function loadChatBootstrap(
  supabase: SupabaseClient,
  userId: string,
): Promise<ChatBootstrap> {
  const { data: userRow } = await supabase
    .from('users')
    .select('focus_areas, age')
    .eq('id', userId)
    .maybeSingle();
  const focusAreas =
    ((userRow as { focus_areas: string[] | null } | null)?.focus_areas ??
      []) as string[];
  const userAge =
    (userRow as { age: number | null } | null)?.age ?? null;

  const journeyOrdering = sortJourneys(focusAreas, userAge);
  const journeySlugs = journeyOrdering.map((j) => j.slug);

  // Same query shape /today uses. General thread = both scope columns
  // null; otherwise route by journey_slug.
  const { data: threadRowsRaw } = await supabase
    .from('mister_p_queries')
    .select('question, answer, journey_slug, goal_id, created_at')
    .eq('user_id', userId)
    .or(
      `and(journey_slug.is.null,goal_id.is.null),journey_slug.in.(${journeySlugs.join(',')})`,
    )
    .order('created_at', { ascending: true });

  const initialThreads: Record<string, ChatMessage[]> = {
    [GENERAL_KEY]: [],
  };
  for (const slug of journeySlugs) initialThreads[slug] = [];

  for (const row of threadRowsRaw ?? []) {
    const r = row as {
      question: string;
      answer: string;
      journey_slug: string | null;
      goal_id: string | null;
    };
    let key: string | null = null;
    if (r.journey_slug && initialThreads[r.journey_slug]) {
      key = r.journey_slug;
    } else if (r.journey_slug === null && r.goal_id === null) {
      key = GENERAL_KEY;
    }
    if (!key) continue;
    initialThreads[key].push(
      { role: 'user', content: r.question },
      { role: 'assistant', content: r.answer },
    );
  }

  // Cap each hydrated thread at 50 pairs (100 messages) — matches
  // /today's payload-budget rule.
  for (const key of Object.keys(initialThreads)) {
    const arr = initialThreads[key];
    if (arr.length > 100) initialThreads[key] = arr.slice(-100);
  }

  const journeys: JourneyOption[] = journeyOrdering.map((j) => ({
    slug: j.slug,
    label: j.label,
  }));

  return { journeys, initialThreads };
}
