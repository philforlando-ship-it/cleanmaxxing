// POST /api/plan/hair/pattern-d/event/[eventId]/resolve
// Marks a side-effect event as resolved (stamps resolved_at). Used
// when the initial shed phase ends, libido normalizes after dose
// adjust, etc. No-op semantically for non-side-effect events but the
// service still updates resolved_at if called.

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { resolveInterventionEvent } from '@/lib/interventions/service';

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ eventId: string }> },
) {
  const { eventId } = await ctx.params;
  if (!eventId) {
    return NextResponse.json({ error: 'missing_event_id' }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    const event = await resolveInterventionEvent(supabase, user.id, eventId);
    return NextResponse.json({ ok: true, event });
  } catch (err) {
    console.error('intervention_event_resolve_failed', err);
    return NextResponse.json(
      { error: 'resolve_failed', message: (err as Error).message },
      { status: 500 },
    );
  }
}
