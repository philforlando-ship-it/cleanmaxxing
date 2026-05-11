// POST /api/plan/sleep/assessment
// Mirrors the hair / style / facial-hair assessment routes. Saves the
// assessment row, then synchronously generates the sleep report.
// Failures of the generation step persist the assessment but report a
// 500 — the Edit answers flow can retry from the saved values.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { SleepAssessmentInputSchema } from '@/lib/sleep/types';
import { saveSleepAssessment } from '@/lib/sleep/service';
import { streamSleepReport } from '@/lib/sleep/generate-report';
import { reconcileCommitmentsForAssessment } from '@/lib/sleep/commitments';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = SleepAssessmentInputSchema.safeParse(body);
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
    assessment = await saveSleepAssessment(supabase, user.id, parsed.data);
  } catch (err) {
    console.error('sleep_assessment_save_failed', err);
    return NextResponse.json(
      { error: 'Could not save assessment' },
      { status: 500 },
    );
  }

  // Reconcile commitments off the new assessment BEFORE the report
  // generation. Two reasons: (1) commitments are deterministic and
  // cheap (no LLM call), so we don't want them gated behind an LLM
  // failure; (2) if report generation 500s, the user still has the
  // commitments to act on while they retry.
  try {
    await reconcileCommitmentsForAssessment(supabase, user.id, assessment);
  } catch (err) {
    // Non-fatal — the assessment is saved, the report generation can
    // still proceed. Surface in logs so we notice if reconciliation
    // is consistently broken.
    console.error('sleep_commitments_reconcile_failed', err);
  }

  let result;
  try {
    result = await streamSleepReport(supabase, user.id, assessment);
  } catch (err) {
    console.error('sleep_report_prep_failed', err);
    return NextResponse.json(
      {
        error:
          'Saved your answers, but the plan generation hit an error. Try again from /plan/sleep.',
      },
      { status: 500 },
    );
  }
  return result.toTextStreamResponse();
}
