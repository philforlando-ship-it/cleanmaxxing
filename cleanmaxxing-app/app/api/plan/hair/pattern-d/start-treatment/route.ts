// POST /api/plan/hair/pattern-d/start-treatment
// User confirms they've started treatment via the Considering surface.
// Sets pattern_d_treatment_started_at — flips the UI to the On Protocol
// placeholder. Soft signal — the user is separately expected to update
// user_profile.current_interventions when they actually get a
// prescription, but Mister P doesn't ask them to maintain two truths
// simultaneously. Either signal is sufficient.

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  getHairAssessment,
  markPatternDTreatmentStarted,
} from '@/lib/hair/service';

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
  if (assessment.stage_2_path !== 'treat') {
    return NextResponse.json(
      { error: 'Pattern D Considering only applies to the Treat path.' },
      { status: 400 },
    );
  }

  try {
    await markPatternDTreatmentStarted(supabase, user.id);
  } catch (err) {
    console.error('hair_pattern_d_start_treatment_failed', err);
    return NextResponse.json(
      { error: 'Could not save your update.' },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
