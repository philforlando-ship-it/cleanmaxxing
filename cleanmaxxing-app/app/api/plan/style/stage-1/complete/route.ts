// POST /api/plan/style/stage-1/complete
// User marks Stage 1 (closet audit) done. Sets stage_1_completed_at,
// which gates Stage 2 (foundation pieces).

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  completeStyleStage1,
  getStyleAssessment,
} from '@/lib/style/service';

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const assessment = await getStyleAssessment(supabase, user.id);
  if (!assessment) {
    return NextResponse.json(
      { error: 'No style assessment on file.' },
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
    await completeStyleStage1(supabase, user.id);
  } catch (err) {
    console.error('style_stage_1_complete_failed', err);
    return NextResponse.json(
      { error: 'Could not mark Stage 1 as complete.' },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
