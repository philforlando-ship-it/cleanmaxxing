// POST /api/plan/style/stage-2/piece
// Toggle a foundation piece slug acquired/not. Validates the slug
// belongs to the user's target archetype catalog before persisting.
// Auto-completes Stage 2 when all 5 archetype slugs are acquired.

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  completeStyleStage2,
  getStyleAssessment,
  toggleFoundationPiece,
} from '@/lib/style/service';
import {
  allSlugsFor,
  isValidFoundationPieceSlug,
} from '@/lib/style/foundation-pieces-content';
import { StyleStage2PieceToggleSchema } from '@/lib/style/types';

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: 'Body must be JSON.' },
      { status: 400 },
    );
  }

  const parsed = StyleStage2PieceToggleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Malformed piece toggle.' },
      { status: 400 },
    );
  }

  const assessment = await getStyleAssessment(supabase, user.id);
  if (!assessment) {
    return NextResponse.json(
      { error: 'No style assessment on file.' },
      { status: 400 },
    );
  }
  if (!assessment.stage_1_completed_at) {
    return NextResponse.json(
      { error: 'Complete Stage 1 first.' },
      { status: 400 },
    );
  }

  if (
    !isValidFoundationPieceSlug(
      assessment.target_archetype,
      parsed.data.piece_slug,
    )
  ) {
    return NextResponse.json(
      { error: `Unknown piece slug: ${parsed.data.piece_slug}` },
      { status: 400 },
    );
  }

  let next: string[];
  try {
    const result = await toggleFoundationPiece(supabase, user.id, parsed.data);
    next = result.pieces_acquired;
  } catch (err) {
    console.error('style_stage_2_toggle_failed', err);
    return NextResponse.json(
      { error: 'Could not save your selection.' },
      { status: 500 },
    );
  }

  // Auto-complete when all 5 archetype slugs are acquired AND Stage 2
  // hasn't already been completed. Manual completion (the "I'm
  // calling it good here" button) lives at /complete.
  const allSlugs = allSlugsFor(assessment.target_archetype);
  const allAcquired = allSlugs.every((s) => next.includes(s));
  if (allAcquired && !assessment.stage_2_completed_at) {
    try {
      await completeStyleStage2(supabase, user.id);
    } catch (err) {
      // Auto-complete is best-effort; surface the toggle success to
      // the user even if the completion timestamp didn't write.
      console.error('style_stage_2_autocomplete_failed', err);
    }
  }

  return NextResponse.json({ ok: true, pieces_acquired: next });
}
