// POST /api/plan/pattern-d/peptides/event/[id]/resolve
// Mark a side-effect event resolved. Same parent-type guard as DELETE.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  getIntervention,
  resolveInterventionEvent,
} from '@/lib/interventions/service';

export async function POST(
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
    .select('intervention_id, event_type')
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
  if (eventRow.event_type !== 'side_effect') {
    return NextResponse.json(
      { error: 'wrong_event_type', message: 'Only side effects can resolve.' },
      { status: 400 },
    );
  }
  const parent = await getIntervention(
    supabase,
    user.id,
    eventRow.intervention_id as string,
  );
  if (!parent || parent.type !== 'peptide') {
    return NextResponse.json({ error: 'wrong_topic' }, { status: 400 });
  }

  try {
    const event = await resolveInterventionEvent(supabase, user.id, id);
    return NextResponse.json({ ok: true, event });
  } catch (err) {
    console.error('peptide_event_resolve_failed', err);
    return NextResponse.json(
      { error: 'resolve_failed', message: (err as Error).message },
      { status: 500 },
    );
  }
}
