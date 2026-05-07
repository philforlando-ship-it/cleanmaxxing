// POST /api/plan/style/stage-2/complete
// Manual completion — user marks Stage 2 done even if not every
// foundation piece is acquired. Used when the user already owns
// equivalents and doesn't want to keep clicking. Sets
// stage_2_completed_at, gating Stage 3.

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  completeStyleStage2,
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
  if (!assessment.stage_1_completed_at) {
    return NextResponse.json(
      { error: 'Complete Stage 1 first.' },
      { status: 400 },
    );
  }

  try {
    await completeStyleStage2(supabase, user.id);
  } catch (err) {
    console.error('style_stage_2_complete_failed', err);
    return NextResponse.json(
      { error: 'Could not mark Stage 2 as complete.' },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
