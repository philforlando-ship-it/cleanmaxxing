// POST /api/plan/hair/stage-3/generate
// Generates the 3-product (or 3-item scalp routine) recommendation for
// the user. Requires Stage 1 to be generated AND Stage 2 to be locked
// in (so the user has consciously committed to a path before products
// get picked). Synchronous — same wait pattern as the report generator.

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getHairAssessment } from '@/lib/hair/service';
import { generateAndSaveHairStage3 } from '@/lib/hair/generate-stage-3';

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const assessment = await getHairAssessment(supabase, user.id);
  if (!assessment) {
    return NextResponse.json(
      { error: 'No hair assessment on file.' },
      { status: 400 },
    );
  }
  if (!assessment.stage_1_cut_family) {
    return NextResponse.json(
      { error: 'Generate Stage 1 (cut strategy) first.' },
      { status: 400 },
    );
  }
  if (!assessment.stage_2_locked_in_at) {
    return NextResponse.json(
      { error: 'Lock in Stage 2 (density action) before product picks.' },
      { status: 400 },
    );
  }

  try {
    await generateAndSaveHairStage3(supabase, user.id, assessment);
  } catch (err) {
    console.error('hair_stage_3_generation_failed', err);
    return NextResponse.json(
      {
        error:
          'Mister P couldn’t finish your product picks. Try again in a moment.',
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
