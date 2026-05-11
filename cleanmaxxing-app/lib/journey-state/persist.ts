// Sync the computed journey phases against journey_states. Called
// from /today data fetch alongside detectAndRecordMilestones. Pattern
// matches the milestone detector: idempotent, never throws upward (a
// sync failure must not break /today), fires phase-transition
// milestones when implementing -> maintaining.
//
// Drift transitions (-> drifting) do NOT fire a milestone — drift is
// a state to surface on /today + /plan, not a celebration. The
// climb-back surface will be a contextual prompt (Phase E pattern),
// not a milestone fire.

import type { SupabaseClient } from '@supabase/supabase-js';
import { recordMilestoneIfNew } from '@/lib/milestones/service';
import { STATIC_TRIGGER_KEYS } from '@/lib/milestones/types';
import {
  computeAllJourneyPhases,
  type ComputedJourneyStates,
  type JourneyPhase,
  type JourneySlug,
} from './compute';

// One milestone per journey for the implementing -> maintaining
// graduation. Drift transitions deliberately have no milestone key.
const MAINTENANCE_MILESTONE_KEY: Record<JourneySlug, string> = {
  hair: STATIC_TRIGGER_KEYS.HAIR_MAINTENANCE_REACHED,
  style: STATIC_TRIGGER_KEYS.STYLE_MAINTENANCE_REACHED,
  body_composition: STATIC_TRIGGER_KEYS.BODY_COMPOSITION_MAINTENANCE_REACHED,
  strength: STATIC_TRIGGER_KEYS.STRENGTH_MAINTENANCE_REACHED,
  cardio: STATIC_TRIGGER_KEYS.CARDIO_MAINTENANCE_REACHED,
  sleep: STATIC_TRIGGER_KEYS.SLEEP_MAINTENANCE_REACHED,
  skincare: STATIC_TRIGGER_KEYS.SKINCARE_MAINTENANCE_REACHED,
  facial_hair: STATIC_TRIGGER_KEYS.FACIAL_HAIR_MAINTENANCE_REACHED,
  facial_structure: STATIC_TRIGGER_KEYS.FACIAL_STRUCTURE_MAINTENANCE_REACHED,
};

type ExistingStateRow = {
  journey_slug: string;
  phase: string;
};

export async function syncJourneyStates(
  supabase: SupabaseClient,
  userId: string,
): Promise<ComputedJourneyStates> {
  const computed = await computeAllJourneyPhases(supabase, userId);

  // Fetch current rows in one query so we can diff against the
  // computed set. Slugs that have no computed phase keep their
  // existing row untouched (an assessment row deletion is the only
  // way to "deactivate" a journey, and that's rare enough to skip
  // for v1).
  const { data: existingData } = await supabase
    .from('journey_states')
    .select('journey_slug, phase')
    .eq('user_id', userId);

  const existing = new Map<string, string>();
  for (const row of (existingData ?? []) as ExistingStateRow[]) {
    existing.set(row.journey_slug, row.phase);
  }

  for (const [slug, state] of Object.entries(computed) as Array<
    [JourneySlug, { phase: JourneyPhase; source: string }]
  >) {
    if (!state) continue;
    const prevPhase = existing.get(slug);

    if (prevPhase === state.phase) {
      // Phase hasn't changed — no-op. We don't touch entered_at on
      // every render; it only advances on real transitions.
      continue;
    }

    await supabase.from('journey_states').upsert(
      {
        user_id: userId,
        journey_slug: slug,
        phase: state.phase,
        entered_at: new Date().toISOString(),
        previous_phase: prevPhase ?? null,
        source: state.source,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,journey_slug' },
    );

    // Fire graduation milestone on implementing -> maintaining.
    // The first time a user is computed (no prev row), this fires if
    // the user already meets the maintaining criteria — that's the
    // backfill-on-first-read behavior we want, so long-time users
    // who already graduated get their milestone retroactively.
    if (
      state.phase === 'maintaining' &&
      (prevPhase === undefined || prevPhase === 'implementing')
    ) {
      await recordMilestoneIfNew(
        supabase,
        userId,
        MAINTENANCE_MILESTONE_KEY[slug],
        { source: state.source, entered_at: new Date().toISOString() },
      );
    }
  }

  return computed;
}
