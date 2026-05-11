// POST /api/plan/style/assessment
// Mirrors the hair assessment route. Saves assessment row, then
// synchronously generates the style report. Failures of the generation
// step persist the assessment but report a 500 — the Edit answers flow
// can retry from the saved values.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { StyleAssessmentInputSchema } from '@/lib/style/types';
import { saveStyleAssessment } from '@/lib/style/service';
import { streamStyleReport } from '@/lib/style/generate-report';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = StyleAssessmentInputSchema.safeParse(body);
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
    assessment = await saveStyleAssessment(supabase, user.id, parsed.data);
  } catch (err) {
    console.error('style_assessment_save_failed', err);
    return NextResponse.json(
      { error: 'Could not save assessment' },
      { status: 500 },
    );
  }

  let result;
  try {
    result = await streamStyleReport(supabase, user.id, assessment);
  } catch (err) {
    console.error('style_report_prep_failed', err);
    return NextResponse.json(
      {
        error:
          'Saved your answers, but the plan generation hit an error. Try again from /plan/style.',
      },
      { status: 500 },
    );
  }
  return result.toTextStreamResponse();
}
