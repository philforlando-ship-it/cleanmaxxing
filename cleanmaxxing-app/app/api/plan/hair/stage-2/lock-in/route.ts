// POST /api/plan/hair/stage-2/lock-in
// Body: { path: 'treat' | 'monitor' | 'transition' }
//
// Stage 1 must be complete first (`stage_1_completed_at` is the unlock
// signal). Pre-Tier-3, the 'treat' path also created a marker goal in
// the legacy goals table; that mechanism retired with the goals
// system on 2026-05-10. stage_2_path is now the single source of
// truth for the user's chosen path.

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { getHairAssessment, lockInStage2 } from '@/lib/hair/service';

const RequestSchema = z.object({
  path: z.enum(['treat', 'monitor', 'transition']),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
  }

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
  if (!assessment.stage_1_completed_at) {
    return NextResponse.json(
      { error: 'Mark Stage 1 complete before locking in Stage 2.' },
      { status: 400 },
    );
  }

  try {
    await lockInStage2(supabase, user.id, parsed.data.path);
  } catch (err) {
    console.error('hair_stage_2_lock_in_failed', err);
    return NextResponse.json(
      { error: 'Could not save your Stage 2 decision.' },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
