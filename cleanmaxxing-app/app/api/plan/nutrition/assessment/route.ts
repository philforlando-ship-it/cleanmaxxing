// POST /api/plan/nutrition/assessment
// Mirrors the other Pattern A v0 assessment routes. Saves the
// assessment row, then synchronously generates the nutrition / body-
// comp report. Failures of the generation step persist the assessment
// but report a 500 — the Edit answers flow can retry from the saved
// values.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { NutritionAssessmentInputSchema } from '@/lib/nutrition/types';
import { saveNutritionAssessment } from '@/lib/nutrition/service';
import { generateAndSaveNutritionReport } from '@/lib/nutrition/generate-report';

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

  try {
    await generateAndSaveNutritionReport(supabase, user.id, assessment);
  } catch (err) {
    console.error('nutrition_report_generation_failed', err);
    return NextResponse.json(
      {
        error:
          'Saved your answers, but the plan generation hit an error. Try again from /plan/nutrition.',
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
