// POST /api/plan/strength/plateau-intervention
// Stamps last_plateau_intervention_at + re-runs the report. The
// prompt's plateau-intervention modifier rule centers "The next move"
// on the Israetel 4-signal SFR test re-evaluation, recommending
// exercise swaps for movements that fail 2 of 4 signals.

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
      last_plateau_intervention_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', user.id);

  const refreshed = await getStrengthAssessment(supabase, user.id);

  try {
    await generateAndSaveStrengthReport(
      supabase,
      user.id,
      refreshed ?? assessment,
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('strength_plateau_intervention_failed', err);
    return NextResponse.json(
      { error: 'generation_failed', message: (err as Error).message },
      { status: 500 },
    );
  }
}
