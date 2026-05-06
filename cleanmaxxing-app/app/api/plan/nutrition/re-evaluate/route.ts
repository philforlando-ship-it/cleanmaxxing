// POST /api/plan/nutrition/re-evaluate
// 12-week re-evaluation stage. Stamps last_evaluated_at + re-runs the
// report (which recomputes TDEE / macro targets from the user's current
// profile, so an updated weight/activity feeds through). Idempotent —
// the user can run this any time.

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getNutritionAssessment } from '@/lib/nutrition/service';
import { generateAndSaveNutritionReport } from '@/lib/nutrition/generate-report';

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const assessment = await getNutritionAssessment(supabase, user.id);
  if (!assessment) {
    return NextResponse.json(
      { error: 'no_assessment' },
      { status: 400 },
    );
  }

  // Stamp last_evaluated_at first so even if the LLM call fails the
  // user doesn't keep seeing the re-eval prompt indefinitely.
  await supabase
    .from('nutrition_assessments')
    .update({
      last_evaluated_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', user.id);

  try {
    await generateAndSaveNutritionReport(supabase, user.id, assessment);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('nutrition_reevaluate_failed', err);
    return NextResponse.json(
      { error: 'generation_failed', message: (err as Error).message },
      { status: 500 },
    );
  }
}
