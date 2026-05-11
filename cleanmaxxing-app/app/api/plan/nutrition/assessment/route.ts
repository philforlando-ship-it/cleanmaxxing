// POST /api/plan/nutrition/assessment
// Mirrors the other Pattern A v0 assessment routes. Saves the
// assessment row, then streams the nutrition / body-comp report
// back to the client. The streamText onFinish callback persists the
// final report text to the DB once the stream completes, so the
// client can redirect to /plan/nutrition and see the saved report
// after the stream ends.
//
// Two response shapes:
//   - 400 / 401 / 500 JSON for failures before the stream starts
//   - text/plain streaming response when generation begins; tokens
//     flow as plain UTF-8, no JSON wrapping. Mid-stream failure
//     surfaces as a closed connection — the client's stream reader
//     handles that case (treats it as an error, asks user to retry).

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { NutritionAssessmentInputSchema } from '@/lib/nutrition/types';
import { saveNutritionAssessment } from '@/lib/nutrition/service';
import { streamNutritionReport } from '@/lib/nutrition/generate-report';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = NutritionAssessmentInputSchema.safeParse(body);
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
    assessment = await saveNutritionAssessment(
      supabase,
      user.id,
      parsed.data,
    );
  } catch (err) {
    console.error('nutrition_assessment_save_failed', err);
    return NextResponse.json(
      { error: 'Could not save assessment' },
      { status: 500 },
    );
  }

  let result;
  try {
    result = await streamNutritionReport(supabase, user.id, assessment);
  } catch (err) {
    console.error('nutrition_report_prep_failed', err);
    return NextResponse.json(
      {
        error:
          'Saved your answers, but the plan generation hit an error. Try again from /plan/nutrition.',
      },
      { status: 500 },
    );
  }

  // text/plain stream — tokens flow directly. onFinish (set inside
  // streamNutritionReport) handles the DB save once the stream
  // completes. Client reads with res.body.getReader().
  return result.toTextStreamResponse();
}
