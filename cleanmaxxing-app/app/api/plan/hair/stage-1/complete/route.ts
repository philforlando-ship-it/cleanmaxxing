// POST /api/plan/hair/stage-1/complete
// User confirms they got the cut. Sets stage_1_completed_at on the
// hair_assessments row — that timestamp is the gate for stage 2 once
// it ships. v1 has no stage 2 yet, so for now this is a soft commitment
// signal more than a hard unlock.

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getHairAssessment, markHairStage1Complete } from '@/lib/hair/service';

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
  if (!assessment.stage_1_generated_at) {
    return NextResponse.json(
      { error: 'Stage 1 hasn’t been generated yet.' },
      { status: 400 },
    );
  }

  try {
    await markHairStage1Complete(supabase, user.id);
  } catch (err) {
    console.error('hair_stage_1_complete_failed', err);
    return NextResponse.json(
      { error: 'Could not mark Stage 1 as complete.' },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
