// POST /api/plan/cardio/assessment
// Mirrors the other Pattern A v0 assessment routes.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { CardioAssessmentInputSchema } from '@/lib/cardio/types';
import { saveCardioAssessment } from '@/lib/cardio/service';
import { streamCardioReport } from '@/lib/cardio/generate-report';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = CardioAssessmentInputSchema.safeParse(body);
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
    assessment = await saveCardioAssessment(supabase, user.id, parsed.data);
  } catch (err) {
    console.error('cardio_assessment_save_failed', err);
    return NextResponse.json(
      { error: 'Could not save assessment' },
      { status: 500 },
    );
  }

  let result;
  try {
    result = await streamCardioReport(supabase, user.id, assessment);
  } catch (err) {
    console.error('cardio_report_prep_failed', err);
    return NextResponse.json(
      {
        error:
          'Saved your answers, but the plan generation hit an error. Try again from /plan/cardio.',
      },
      { status: 500 },
    );
  }
  return result.toTextStreamResponse();
}
