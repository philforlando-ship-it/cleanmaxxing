// POST /api/plan/hair/stage-5/log-session
// User confirms they took the photo session. Increments
// stage_5_session_count + sets stage_5_last_session_at. 24-hour dedup
// to guard against double-tap (sessions are quarterly; a same-day
// repeat is always an accident).

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getHairAssessment, logStage5Session } from '@/lib/hair/service';

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
  if (!assessment.stage_5_started_at) {
    return NextResponse.json(
      { error: 'Start Stage 5 before logging a session.' },
      { status: 400 },
    );
  }

  let result;
  try {
    result = await logStage5Session(supabase, user.id);
  } catch (err) {
    console.error('hair_stage_5_log_session_failed', err);
    return NextResponse.json(
      { error: 'Could not log the session.' },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    deduped: result.deduped,
    count: result.newCount,
  });
}
