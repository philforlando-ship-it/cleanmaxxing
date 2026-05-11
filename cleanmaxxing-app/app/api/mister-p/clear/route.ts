// Clears a Mister P chat thread. Hard-deletes every mister_p_queries
// row matching (user_id, journey_slug). Confirmed-delete behavior
// was the user's explicit choice over a soft-clear flag — "clear"
// should mean gone.
//
// Scopes:
//   - journey_slug set + valid → that journey's thread.
//   - journey_slug null/invalid → General thread (rows with
//     journey_slug IS NULL).
//
// The pre-Tier-3 goal_id scope retired alongside the goals system
// on 2026-05-10. /goals/[id] panel was deleted in Sub-ship A and
// the legacy goal-scoped reads in /api/mister-p/ask were dropped
// in Sub-ship B.

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { JOURNEYS } from '@/lib/today/journeys';

const VALID_JOURNEY_SLUGS = new Set<string>(JOURNEYS.map((j) => j.slug));

const RequestSchema = z.object({
  journey_slug: z.string().nullable().optional(),
});

export async function POST(req: NextRequest) {
  const parsed = RequestSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
  const { journey_slug: requestedJourneySlug = null } = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let journeySlug: string | null = null;
  if (
    requestedJourneySlug &&
    VALID_JOURNEY_SLUGS.has(requestedJourneySlug)
  ) {
    journeySlug = requestedJourneySlug;
  }

  let query = supabase
    .from('mister_p_queries')
    .delete()
    .eq('user_id', user.id);

  if (journeySlug) {
    query = query.eq('journey_slug', journeySlug);
  } else {
    query = query.is('journey_slug', null);
  }

  const { error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
