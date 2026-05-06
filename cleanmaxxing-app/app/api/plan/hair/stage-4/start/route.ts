// POST /api/plan/hair/stage-4/start
// User opts into the daily styling routine. Sets started_at +
// modifier-aware target on the assessment row. Stage 2 must be locked
// in first (per the framework's stage progression).

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getHairAssessment, startStage4 } from '@/lib/hair/service';
import { computeStage4Target } from '@/lib/hair/stage-4-content';
import { getUserProfile } from '@/lib/profile/service';

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
  if (!assessment.stage_3_acknowledged_at) {
    return NextResponse.json(
      { error: 'Acknowledge Stage 3 (products) before starting Stage 4.' },
      { status: 400 },
    );
  }

  const profile = await getUserProfile(supabase, user.id);
  const target = computeStage4Target(profile.current_interventions);

  try {
    await startStage4(supabase, user.id, target);
  } catch (err) {
    console.error('hair_stage_4_start_failed', err);
    return NextResponse.json(
      { error: 'Could not start Stage 4.' },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, target });
}
