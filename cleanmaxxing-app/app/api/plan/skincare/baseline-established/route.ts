// POST /api/plan/skincare/baseline-established
// Stamps baseline_established_at on the skincare assessment + re-runs
// the report. Once the floor is in place, the report's modifier
// handling shifts from "build cleanser + moisturizer + SPF first" to
// "floor is in, recommend the next move."

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  getSkincareAssessment,
  markBaselineEstablished,
} from '@/lib/skincare/service';
import { generateAndSaveSkincareReport } from '@/lib/skincare/generate-report';

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    await markBaselineEstablished(supabase, user.id);
  } catch (err) {
    if ((err as Error).message === 'no_assessment') {
      return NextResponse.json({ error: 'no_assessment' }, { status: 400 });
    }
    throw err;
  }

  const refreshed = await getSkincareAssessment(supabase, user.id);
  if (!refreshed) {
    return NextResponse.json({ error: 'no_assessment' }, { status: 400 });
  }

  try {
    await generateAndSaveSkincareReport(supabase, user.id, refreshed);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('skincare_baseline_established_failed', err);
    return NextResponse.json(
      { error: 'generation_failed', message: (err as Error).message },
      { status: 500 },
    );
  }
}
