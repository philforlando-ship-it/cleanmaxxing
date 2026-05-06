// POST /api/plan/strength/graduate-beginner-ramp
// Marks the user's beginner ramp as completed and re-runs the
// strength report. The report prompt switches off the beginner-ramp
// prescription branch when this timestamp is set, sending the user
// into the main Israetel framework with split selection.

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getStrengthAssessment } from '@/lib/strength/service';
import { generateAndSaveStrengthReport } from '@/lib/strength/generate-report';

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const assessment = await getStrengthAssessment(supabase, user.id);
  if (!assessment) {
    return NextResponse.json({ error: 'no_assessment' }, { status: 400 });
  }

  await supabase
    .from('strength_assessments')
    .update({
      beginner_ramp_completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', user.id);

  // Re-fetch to capture the new timestamp before regeneration so the
  // generator sees beginner_ramp_completed_at != null.
  const refreshed = await getStrengthAssessment(supabase, user.id);

  try {
    await generateAndSaveStrengthReport(
      supabase,
      user.id,
      refreshed ?? assessment,
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('strength_graduate_failed', err);
    return NextResponse.json(
      { error: 'generation_failed', message: (err as Error).message },
      { status: 500 },
    );
  }
}
