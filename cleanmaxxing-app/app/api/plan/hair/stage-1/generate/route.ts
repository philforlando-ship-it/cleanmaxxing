// POST /api/plan/hair/stage-1/generate
// Generates the cut-family + barber-instructions recommendation for the
// authenticated user. Requires that the personal report (Stage 0) has
// already been generated; without it the LLM has no diagnosis to
// translate from. Synchronous from the user's perspective — the form
// shows a pending state and we save the recommendation before responding.

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getHairAssessment } from '@/lib/hair/service';
import { generateAndSaveHairStage1 } from '@/lib/hair/generate-stage-1';

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const [assessment, { data: userRow }] = await Promise.all([
    getHairAssessment(supabase, user.id),
    supabase.from('users').select('age').eq('id', user.id).maybeSingle(),
  ]);
  if (!assessment) {
    return NextResponse.json(
      { error: 'No hair assessment on file.' },
      { status: 400 },
    );
  }
  if (!assessment.report_text) {
    return NextResponse.json(
      { error: 'Generate the personal report first.' },
      { status: 400 },
    );
  }
  const age = (userRow as { age: number | null } | null)?.age ?? null;

  try {
    await generateAndSaveHairStage1(supabase, user.id, assessment, age);
  } catch (err) {
    console.error('hair_stage_1_generation_failed', err);
    return NextResponse.json(
      {
        error:
          'Mister P couldn’t finish your cut recommendation. Try again in a moment.',
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
