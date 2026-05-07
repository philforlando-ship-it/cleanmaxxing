// POST /api/plan/style/stage-3/acknowledge
// User reads the fit-calibration principles and acknowledges them.
// Sets stage_3_acknowledged_at, marking the v0 journey complete.

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  acknowledgeStyleStage3,
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
  if (!assessment.stage_2_completed_at) {
    return NextResponse.json(
      { error: 'Complete Stage 2 first.' },
      { status: 400 },
    );
  }

  try {
    await acknowledgeStyleStage3(supabase, user.id);
  } catch (err) {
    console.error('style_stage_3_ack_failed', err);
    return NextResponse.json(
      { error: 'Could not record your acknowledgement.' },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
