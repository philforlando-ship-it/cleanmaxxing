// POST /api/plan/skincare/start-retinoid
// Stamps retinoid_started_at on the skincare assessment + re-runs
// the report. The prompt's modifier handling for this stage shifts
// the routine recommendation to include the retinoid (adapalene OTC
// or tretinoin if the user mentioned a prescriber path).

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
      retinoid_started_at: new Date().toISOString(),
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
    console.error('skincare_start_retinoid_failed', err);
    return NextResponse.json(
      { error: 'generation_failed', message: (err as Error).message },
      { status: 500 },
    );
  }
}
