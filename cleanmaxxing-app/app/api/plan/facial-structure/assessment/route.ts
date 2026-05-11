// POST /api/plan/facial-structure/assessment
// Mirrors the other Pattern A v0 assessment routes (see
// app/api/plan/skincare/assessment/route.ts). Saves the assessment
// row, then synchronously generates the facial structure report.
// Failures of the generation step persist the assessment but return
// 500 — the Edit answers flow retries from the saved values.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { FacialStructureAssessmentInputSchema } from '@/lib/facial-structure/types';
import { saveFacialStructureAssessment } from '@/lib/facial-structure/service';
import { streamFacialStructureReport } from '@/lib/facial-structure/generate-report';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = FacialStructureAssessmentInputSchema.safeParse(body);
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
    assessment = await saveFacialStructureAssessment(
      supabase,
      user.id,
      parsed.data,
    );
  } catch (err) {
    console.error('facial_structure_assessment_save_failed', err);
    return NextResponse.json(
      { error: 'Could not save assessment' },
      { status: 500 },
    );
  }

  let result;
  try {
    result = await streamFacialStructureReport(supabase, user.id, assessment);
  } catch (err) {
    console.error('facial_structure_report_prep_failed', err);
    return NextResponse.json(
      {
        error:
          'Saved your answers, but the plan generation hit an error. Try again from /plan/facial-structure.',
      },
      { status: 500 },
    );
  }
  return result.toTextStreamResponse();
}
