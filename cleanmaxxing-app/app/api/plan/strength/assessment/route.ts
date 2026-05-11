// POST /api/plan/strength/assessment
// Mirrors the other Pattern A v0 assessment routes.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { StrengthAssessmentInputSchema } from '@/lib/strength/types';
import { saveStrengthAssessment } from '@/lib/strength/service';
import { streamStrengthReport } from '@/lib/strength/generate-report';

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

  // Write training_experience through to user_profile so it's the
  // single source of truth across journeys + Mister P prompt.
  // Non-fatal — the assessment is the primary write and already
  // succeeded; the report can still generate even if this update
  // misses (it'll fall back to the existing profile value or null).
  try {
    await supabase
      .from('user_profile')
      .update({
        training_experience: parsed.data.training_experience,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id);
  } catch (err) {
    console.error('strength_assessment_profile_writethrough_failed', err);
  }

  let result;
  try {
    result = await streamStrengthReport(supabase, user.id, assessment);
  } catch (err) {
    console.error('strength_report_prep_failed', err);
    return NextResponse.json(
      {
        error:
          'Saved your answers, but the plan generation hit an error. Try again from /plan/strength.',
      },
      { status: 500 },
    );
  }
  return result.toTextStreamResponse();
}
