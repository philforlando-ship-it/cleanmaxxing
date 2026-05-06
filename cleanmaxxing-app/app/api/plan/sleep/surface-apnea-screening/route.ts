// POST /api/plan/sleep/surface-apnea-screening
// Stamps apnea_screening_surfaced_at + re-runs the report. Prompt's
// modifier rule centers "The next move" on the apnea screening
// criteria + sleep study referral. Narrowed scope vs. generic Rx
// escalation — POV 42 is explicit that the prescriber path here is
// apnea-specific.

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSleepAssessment } from '@/lib/sleep/service';
import { generateAndSaveSleepReport } from '@/lib/sleep/generate-report';

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const assessment = await getSleepAssessment(supabase, user.id);
  if (!assessment) {
    return NextResponse.json({ error: 'no_assessment' }, { status: 400 });
  }

  await supabase
    .from('sleep_assessments')
    .update({
      apnea_screening_surfaced_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', user.id);

  const refreshed = await getSleepAssessment(supabase, user.id);

  try {
    await generateAndSaveSleepReport(
      supabase,
      user.id,
      refreshed ?? assessment,
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('sleep_apnea_screening_failed', err);
    return NextResponse.json(
      { error: 'generation_failed', message: (err as Error).message },
      { status: 500 },
    );
  }
}
