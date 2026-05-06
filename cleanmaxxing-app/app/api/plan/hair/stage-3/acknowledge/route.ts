// POST /api/plan/hair/stage-3/acknowledge
// User confirms they have the recommended products (or already use
// equivalents). Sets stage_3_acknowledged_at — that timestamp is the
// gate to Stage 4 because the daily routine literally needs the
// product to exist.

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ackHairStage3, getHairAssessment } from '@/lib/hair/service';

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const assessment = await getHairAssessment(supabase, user.id);
  if (!assessment) {
    return NextResponse.json(
      { error: 'No hair assessment on file.' },
      { status: 400 },
    );
  }
  if (!assessment.stage_3_generated_at) {
    return NextResponse.json(
      { error: 'Stage 3 hasn’t been generated yet.' },
      { status: 400 },
    );
  }

  try {
    await ackHairStage3(supabase, user.id);
  } catch (err) {
    console.error('hair_stage_3_ack_failed', err);
    return NextResponse.json(
      { error: 'Could not save your acknowledgment.' },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
