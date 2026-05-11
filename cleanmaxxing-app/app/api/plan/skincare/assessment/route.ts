// POST /api/plan/skincare/assessment
// Mirrors the other Pattern A v0 assessment routes. Saves the
// assessment row, then synchronously generates the skincare report.
// Failures of the generation step persist the assessment but report
// a 500 — the Edit answers flow can retry from the saved values.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { SkincareAssessmentInputSchema } from '@/lib/skincare/types';
import { saveSkincareAssessment } from '@/lib/skincare/service';
import { streamSkincareReport } from '@/lib/skincare/generate-report';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = SkincareAssessmentInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid assessment payload' },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let assessment;
  try {
    assessment = await saveSkincareAssessment(supabase, user.id, parsed.data);
  } catch (err) {
    console.error('skincare_assessment_save_failed', err);
    return NextResponse.json(
      { error: 'Could not save assessment' },
      { status: 500 },
    );
  }

  let result;
  try {
    result = await streamSkincareReport(supabase, user.id, assessment);
  } catch (err) {
    console.error('skincare_report_prep_failed', err);
    return NextResponse.json(
      {
        error:
          'Saved your answers, but the plan generation hit an error. Try again from /plan/skincare.',
      },
      { status: 500 },
    );
  }
  return result.toTextStreamResponse();
}
