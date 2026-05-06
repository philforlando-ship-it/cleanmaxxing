// POST /api/plan/hair/assessment
// Save the user's hair assessment and synchronously generate the
// personal report. Returns once both are persisted. Synchronous flow
// is intentional for v0 — generation takes ~3-6s, the assessment form
// shows a pending state, and we avoid the polling/notification UX a
// background job would require.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { HairAssessmentInputSchema } from '@/lib/hair/types';
import { saveHairAssessment } from '@/lib/hair/service';
import { generateAndSaveHairReport } from '@/lib/hair/generate-report';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = HairAssessmentInputSchema.safeParse(body);
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

  // Save the assessment first. If the LLM call fails downstream we
  // still want the assessment persisted — the user can retry generation
  // without re-entering their answers. (We don't surface a retry UI in
  // v0 yet; this just keeps the option open without a second migration.)
  let assessment;
  try {
    assessment = await saveHairAssessment(supabase, user.id, parsed.data);
  } catch (err) {
    console.error('hair_assessment_save_failed', err);
    return NextResponse.json(
      { error: 'Could not save assessment' },
      { status: 500 },
    );
  }

  try {
    await generateAndSaveHairReport(supabase, user.id, assessment);
  } catch (err) {
    console.error('hair_report_generation_failed', err);
    return NextResponse.json(
      {
        error:
          'Saved your answers, but the plan generation hit an error. Try again from /plan/hair.',
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
