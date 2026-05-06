// POST /api/plan/cardio/add-hiit
// Stage transition: Zone 2 base → add HIIT layer (Norwegian 4×4).
// Stamps hiit_layer_started_at + re-runs the report. Prompt's
// modifier rule centers the prescription on the 4×4 protocol with
// recovery-cost guidance.

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCardioAssessment } from '@/lib/cardio/service';
import { generateAndSaveCardioReport } from '@/lib/cardio/generate-report';

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const assessment = await getCardioAssessment(supabase, user.id);
  if (!assessment) {
    return NextResponse.json({ error: 'no_assessment' }, { status: 400 });
  }

  await supabase
    .from('cardio_assessments')
    .update({
      hiit_layer_started_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', user.id);

  const refreshed = await getCardioAssessment(supabase, user.id);

  try {
    await generateAndSaveCardioReport(
      supabase,
      user.id,
      refreshed ?? assessment,
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('cardio_add_hiit_failed', err);
    return NextResponse.json(
      { error: 'generation_failed', message: (err as Error).message },
      { status: 500 },
    );
  }
}
