// Read helpers for journey_states. Surface code uses these to gate
// maintenance views, drift cards, and picker buckets.
//
// These are pure reads — they DO NOT run sync. The intended pattern
// is: /today's data fetch calls syncJourneyStates first (which writes
// any changes), then subsequent reads see the freshly-written state.
// Surfaces that only need to read (a /plan/[topic] page rendered
// shortly after /today) can call these directly without re-syncing.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { JourneyPhase, JourneySlug } from './compute';

export type JourneyStateRow = {
  journey_slug: JourneySlug;
  phase: JourneyPhase;
  entered_at: string;
  previous_phase: JourneyPhase | null;
  source: string | null;
};

// Returns the row for a single journey, or null if the user has no
// row for that journey (= journey not yet active).
export async function getJourneyPhase(
  supabase: SupabaseClient,
  userId: string,
  slug: JourneySlug,
): Promise<JourneyStateRow | null> {
  const { data, error } = await supabase
    .from('journey_states')
    .select('journey_slug, phase, entered_at, previous_phase, source')
    .eq('user_id', userId)
    .eq('journey_slug', slug)
    .maybeSingle();
  if (error) throw error;
  return (data as JourneyStateRow | null) ?? null;
}

// Returns a map keyed by journey_slug. Slugs with no row are missing
// from the map (callers should treat absence as "not active").
export async function getAllJourneyPhases(
  supabase: SupabaseClient,
  userId: string,
): Promise<Partial<Record<JourneySlug, JourneyStateRow>>> {
  const { data, error } = await supabase
    .from('journey_states')
    .select('journey_slug, phase, entered_at, previous_phase, source')
    .eq('user_id', userId);
  if (error) throw error;
  const out: Partial<Record<JourneySlug, JourneyStateRow>> = {};
  for (const row of (data ?? []) as JourneyStateRow[]) {
    out[row.journey_slug] = row;
  }
  return out;
}
