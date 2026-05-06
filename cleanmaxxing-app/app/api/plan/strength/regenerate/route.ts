// POST /api/plan/strength/regenerate
// Re-run the strength report against the existing assessment row
// (including any picker preferences saved since the last generation).
// No request body — server reads the current assessment.
//
// Use case: user updates exercise picker preferences and wants the
// new picks reflected in the plan without re-filling the assessment.

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
    return NextResponse.json(
      { error: 'no_assessment', message: 'Complete the assessment first.' },
      { status: 400 },
    );
  }

  try {
    await generateAndSaveStrengthReport(supabase, user.id, assessment);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('strength_report_regenerate_failed', err);
    return NextResponse.json(
      { error: 'generation_failed', message: (err as Error).message },
      { status: 500 },
    );
  }
}
