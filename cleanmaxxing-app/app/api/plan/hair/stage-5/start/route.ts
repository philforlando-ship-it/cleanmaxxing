// POST /api/plan/hair/stage-5/start
// Starts the photo-monitoring cadence. Computes the default cadence
// from modifier context (density state, stage 2 path, fin/min status)
// and stores it on the row. Stage 4 must be complete first — daily
// routine is the gate to monitoring per the framework's stage chain.

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  canStartStage5,
  getHairAssessment,
  startStage5,
} from '@/lib/hair/service';
import { computeStage5DefaultCadence } from '@/lib/hair/stage-5-content';
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
  // Loosened gate (2026-05-08): unlock when Stage 4 hits its target
  // OR 14 calendar days have elapsed since Stage 4 start with at
  // least one logged routine. Need the live log count for the
  // calendar-gate branch.
  const { count: logCount } = await supabase
    .from('hair_daily_routine_logs')
    .select('on_date', { count: 'exact', head: true })
    .eq('user_id', user.id);
  if (!canStartStage5(assessment, logCount ?? 0)) {
    return NextResponse.json(
      {
        error:
          'Spend a couple of weeks on your daily routine before starting Stage 5.',
      },
      { status: 400 },
    );
  }

  const profile = await getUserProfile(supabase, user.id);
  const cadence = computeStage5DefaultCadence({
    density_state: assessment.density_state,
    stage_2_path: assessment.stage_2_path,
    cut_family: assessment.stage_1_cut_family,
    current_interventions: profile.current_interventions,
    pattern_d_treatment_started_at: assessment.pattern_d_treatment_started_at,
  });

  try {
    await startStage5(supabase, user.id, cadence);
  } catch (err) {
    console.error('hair_stage_5_start_failed', err);
    return NextResponse.json(
      { error: 'Could not start Stage 5.' },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, cadence_days: cadence });
}
