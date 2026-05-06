// POST /api/plan/skincare/step-up
// 12-week step-up gate. Stamps last_step_up_at + re-runs the
// skincare report. Prompt's modifier rule centers "The next move"
// on the next layer in the ladder (Rx tretinoin → vitamin C →
// professional treatments) based on what's already in place.

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSkincareAssessment } from '@/lib/skincare/service';
import { generateAndSaveSkincareReport } from '@/lib/skincare/generate-report';

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const assessment = await getSkincareAssessment(supabase, user.id);
  if (!assessment) {
    return NextResponse.json({ error: 'no_assessment' }, { status: 400 });
  }

  await supabase
    .from('skincare_assessments')
    .update({
      last_step_up_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', user.id);

  const refreshed = await getSkincareAssessment(supabase, user.id);

  try {
    await generateAndSaveSkincareReport(
      supabase,
      user.id,
      refreshed ?? assessment,
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('skincare_step_up_failed', err);
    return NextResponse.json(
      { error: 'generation_failed', message: (err as Error).message },
      { status: 500 },
    );
  }
}
