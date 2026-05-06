// POST /api/plan/hair/stage-6/start
// Terminal stage. Computes cut cadence from cut_family and locks in
// the maintenance posture. Stage 5 must be started first (not
// completed — Stage 5 is perpetual).

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getHairAssessment, startStage6 } from '@/lib/hair/service';
import { computeCutCadenceWeeks } from '@/lib/hair/stage-6-content';

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
      { error: 'Start Stage 5 before locking in Stage 6.' },
      { status: 400 },
    );
  }
  if (!assessment.stage_1_cut_family) {
    return NextResponse.json(
      { error: 'Stage 1 must be generated to derive cut cadence.' },
      { status: 400 },
    );
  }

  const cadenceWeeks = computeCutCadenceWeeks(assessment.stage_1_cut_family);

  try {
    await startStage6(supabase, user.id, cadenceWeeks);
  } catch (err) {
    console.error('hair_stage_6_start_failed', err);
    return NextResponse.json(
      { error: 'Could not lock in Stage 6.' },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, cut_cadence_weeks: cadenceWeeks });
}
