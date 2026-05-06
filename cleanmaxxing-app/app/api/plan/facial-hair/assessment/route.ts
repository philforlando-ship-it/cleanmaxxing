// POST /api/plan/facial-hair/assessment
// Mirrors the hair / style assessment routes. Saves assessment row,
// then synchronously generates the facial-hair report. Failures of the
// generation step persist the assessment but report a 500 — the Edit
// answers flow can retry from the saved values.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { FacialHairAssessmentInputSchema } from '@/lib/facial-hair/types';
import { saveFacialHairAssessment } from '@/lib/facial-hair/service';
import { generateAndSaveFacialHairReport } from '@/lib/facial-hair/generate-report';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = FacialHairAssessmentInputSchema.safeParse(body);
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
    assessment = await saveFacialHairAssessment(supabase, user.id, parsed.data);
  } catch (err) {
    console.error('facial_hair_assessment_save_failed', err);
    return NextResponse.json(
      { error: 'Could not save assessment' },
      { status: 500 },
    );
  }

  try {
    await generateAndSaveFacialHairReport(supabase, user.id, assessment);
  } catch (err) {
    console.error('facial_hair_report_generation_failed', err);
    return NextResponse.json(
      {
        error:
          'Saved your answers, but the plan generation hit an error. Try again from /plan/facial-hair.',
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
