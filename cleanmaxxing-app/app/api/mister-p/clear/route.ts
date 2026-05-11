// Clears a Mister P chat thread. Hard-deletes every mister_p_queries
// row matching (user_id, scope). Confirmed-delete behavior was the
// user's explicit choice over a soft-clear flag — "clear" should
// mean gone.
//
// Scopes (mutually exclusive, both nullable):
//   - journey_slug — current primary picker on /today (mig 0104).
//     Targets rows where journey_slug = $arg.
//   - goal_id — legacy /goals/[id] path. Targets rows where
//     goal_id = $arg.
//   - Both null — General thread (rows where BOTH scope columns
//     are null).
//
// When both are sent (a misbehaving client), journey_slug wins —
// matches the precedence in /api/mister-p/ask.

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { JOURNEYS } from '@/lib/today/journeys';

const VALID_JOURNEY_SLUGS = new Set<string>(JOURNEYS.map((j) => j.slug));

const RequestSchema = z.object({
  goal_id: z.string().uuid().nullable().optional(),
  journey_slug: z.string().nullable().optional(),
});

export async function POST(req: NextRequest) {
  const parsed = RequestSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
  const {
    goal_id = null,
    journey_slug: requestedJourneySlug = null,
  } = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Resolve scope. journey_slug takes precedence over goal_id.
  let journeySlug: string | null = null;
  if (
    requestedJourneySlug &&
    VALID_JOURNEY_SLUGS.has(requestedJourneySlug)
  ) {
    journeySlug = requestedJourneySlug;
  }

  if (journeySlug) {
    // RLS on mister_p_queries already restricts delete to the caller's
    // rows; no extra ownership check needed for journey-scoped clears
    // (the journey_slug is a public enum, not a per-user resource).
    const { error } = await supabase
      .from('mister_p_queries')
      .delete()
      .eq('user_id', user.id)
      .eq('journey_slug', journeySlug);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  } else if (goal_id) {
    // Verify the goal belongs to this user before clearing its thread.
    // RLS on mister_p_queries already restricts to the caller's user_id,
    // so a foreign goal_id can't cross-delete in the worst case — but
    // an explicit 404 is clearer than a silent 0-row delete and
    // surfaces the case where a stale goal_id is sent from a stale tab.
    const { data: ownedGoal } = await supabase
      .from('goals')
      .select('id')
      .eq('id', goal_id)
      .eq('user_id', user.id)
      .maybeSingle();
    if (!ownedGoal) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 });
    }

    const { error } = await supabase
      .from('mister_p_queries')
      .delete()
      .eq('user_id', user.id)
      .eq('goal_id', goal_id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  } else {
    // General thread (both scope columns IS NULL). RLS constrains
    // delete to this user's rows.
    const { error } = await supabase
      .from('mister_p_queries')
      .delete()
      .eq('user_id', user.id)
      .is('journey_slug', null)
      .is('goal_id', null);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}
