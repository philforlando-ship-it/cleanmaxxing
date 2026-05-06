// POST /api/plan/strength/assessment
// Mirrors the other Pattern A v0 assessment routes.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { StrengthAssessmentInputSchema } from '@/lib/strength/types';
import { saveStrengthAssessment } from '@/lib/strength/service';
import { generateAndSaveStrengthReport } from '@/lib/strength/generate-report';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = StrengthAssessmentInputSchema.safeParse(body);
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
    assessment = await saveStrengthAssessment(supabase, user.id, parsed.data);
  } catch (err) {
    console.error('strength_assessment_save_failed', err);
    return NextResponse.json(
      { error: 'Could not save assessment' },
      { status: 500 },
    );
  }

  try {
    await generateAndSaveStrengthReport(supabase, user.id, assessment);
  } catch (err) {
    console.error('strength_report_generation_failed', err);
    return NextResponse.json(
      {
        error:
          'Saved your answers, but the plan generation hit an error. Try again from /plan/strength.',
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
