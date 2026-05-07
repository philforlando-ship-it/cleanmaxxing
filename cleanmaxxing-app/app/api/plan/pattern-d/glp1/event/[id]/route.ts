// DELETE /api/plan/pattern-d/glp1/event/[id]
// Remove an event row. RLS gates ownership; we additionally guard
// that the parent intervention is of type='glp1' so this route can't
// delete events on hair / TRT / etc. through cross-route abuse.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  deleteInterventionEvent,
  getIntervention,
} from '@/lib/interventions/service';

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { data: eventRow, error: fetchErr } = await supabase
    .from('intervention_events')
    .select('intervention_id')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle();
  if (fetchErr) {
    return NextResponse.json(
      { error: 'lookup_failed', message: fetchErr.message },
      { status: 500 },
    );
  }
  if (!eventRow) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  const parent = await getIntervention(
    supabase,
    user.id,
    eventRow.intervention_id as string,
  );
  if (!parent || parent.type !== 'glp1') {
    return NextResponse.json({ error: 'wrong_topic' }, { status: 400 });
  }

  try {
    await deleteInterventionEvent(supabase, user.id, id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('glp1_event_delete_failed', err);
    return NextResponse.json(
      { error: 'delete_failed', message: (err as Error).message },
      { status: 500 },
    );
  }
}
