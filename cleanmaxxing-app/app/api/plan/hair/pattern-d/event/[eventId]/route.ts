// DELETE /api/plan/hair/pattern-d/event/[eventId]
// Removes an event from the timeline. RLS scopes the delete to the
// user's own rows. Used when the user logs an event by accident or
// wants to clean up history.

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { deleteInterventionEvent } from '@/lib/interventions/service';

export async function DELETE(
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
    await deleteInterventionEvent(supabase, user.id, eventId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('intervention_event_delete_failed', err);
    return NextResponse.json(
      { error: 'delete_failed', message: (err as Error).message },
      { status: 500 },
    );
  }
}
