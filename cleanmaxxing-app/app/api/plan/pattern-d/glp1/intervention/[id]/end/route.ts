// POST /api/plan/pattern-d/glp1/intervention/[id]/end
// User pressed "I've stopped the medication" on the Off-ramp
// surface. Flips status='off' and stamps ended_at via
// setInterventionStatus, which also re-syncs the legacy
// current_interventions[] array (drops glp1 from it).

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  getIntervention,
  setInterventionStatus,
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

  const intervention = await getIntervention(supabase, user.id, id);
  if (!intervention) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  if (intervention.type !== 'glp1') {
    return NextResponse.json({ error: 'wrong_topic' }, { status: 400 });
  }
  if (intervention.status === 'off') {
    return NextResponse.json({ ok: true, alreadyOff: true });
  }

  try {
    const updated = await setInterventionStatus(supabase, user.id, id, 'off');
    return NextResponse.json({ ok: true, intervention: updated });
  } catch (err) {
    console.error('glp1_intervention_end_failed', err);
    return NextResponse.json(
      { error: 'end_failed', message: (err as Error).message },
      { status: 500 },
    );
  }
}
