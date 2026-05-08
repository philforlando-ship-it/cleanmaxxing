// POST /api/plan/hair/stage-1/override
// User picks a different cut from the alternates surfaced on /plan/hair.
// Validates the chosen cut is within the density+age allowed set
// (the picker UI should only show valid choices, but server-side check
// is non-negotiable), then re-runs Stage 1 generation with that cut
// forced so the barber-instructions block is rewritten for the
// user's pick.

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { getHairAssessment } from '@/lib/hair/service';
import { generateAndSaveHairStage1 } from '@/lib/hair/generate-stage-1';
import { cutsForDensity } from '@/lib/hair/cut-by-density';
import { cutsForAge } from '@/lib/hair/cut-by-age';
import type { CutFamily } from '@/lib/hair/types';

const PostSchema = z.object({
  cut_family: z.string(),
});

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const parsed = PostSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400 },
    );
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
  // Hard reject if Stage 1 is already marked complete — overrides
  // can't change a cut the user already got. Re-generate path stays
  // open via the existing /generate endpoint if they want to re-run
  // the LLM-picked recommendation.
  if (assessment.stage_1_completed_at) {
    return NextResponse.json(
      { error: 'Stage 1 is already complete.' },
      { status: 400 },
    );
  }

  const age = (userRow as { age: number | null } | null)?.age ?? null;
  const allowedCuts = cutsForAge(
    age,
    cutsForDensity(assessment.density_state),
  );
  const cutFamily = parsed.data.cut_family as CutFamily;
  if (!allowedCuts.includes(cutFamily)) {
    return NextResponse.json(
      {
        error:
          'That cut isn’t in the recommended set for your density and age.',
      },
      { status: 400 },
    );
  }

  try {
    await generateAndSaveHairStage1(
      supabase,
      user.id,
      assessment,
      age,
      cutFamily,
    );
  } catch (err) {
    console.error('hair_stage_1_override_failed', err);
    return NextResponse.json(
      { error: 'Could not save your choice. Try again in a moment.' },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
