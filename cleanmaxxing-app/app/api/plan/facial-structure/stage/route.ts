// POST /api/plan/facial-structure/stage
// Body: { stage: 1|2|3|4, action: 'ack'|'start'|'complete' }
//
// Stage state mapped to assessment columns:
//   stage 1 + ack       → stage_1_acknowledged_at
//   stage 2 + start     → stage_2_started_at
//   stage 2 + complete  → stage_2_completed_at (auto-unlocks stage 4
//                         if openness >= curious_about_options)
//   stage 3 + ack       → stage_3_acknowledged_at
//   stage 4 + ack       → stage_4_acknowledged_at
//
// Stage 4 has TWO timestamps: unlock (server-set automatically when
// Stage 2 completes AND openness gate met) and acknowledged (set when
// the user clicks the explicit ack button). The ack is the signal
// the user actually engaged with the cosmetic content at /plan/procedures.

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

const RequestSchema = z.object({
  stage: z.union([
    z.literal(1),
    z.literal(2),
    z.literal(3),
    z.literal(4),
  ]),
  action: z.enum(['ack', 'start', 'complete']),
});

// Stage 4 unlock gate — cosmetic_procedure_openness values that qualify.
const UNLOCK_OPENNESS: ReadonlyArray<string> = [
  'curious_about_options',
  'actively_considering',
  'already_done',
];

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid_request' },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { stage, action } = parsed.data;
  const now = new Date().toISOString();
  const update: Record<string, string> = { updated_at: now };

  if (stage === 1 && action === 'ack') {
    update.stage_1_acknowledged_at = now;
  } else if (stage === 2 && action === 'start') {
    update.stage_2_started_at = now;
  } else if (stage === 2 && action === 'complete') {
    update.stage_2_completed_at = now;
    // Stage 4 unlock check needs the user's openness — fetch first.
    const { data: existing } = await supabase
      .from('facial_structure_assessments')
      .select('cosmetic_procedure_openness, stage_4_unlocked_at')
      .eq('user_id', user.id)
      .maybeSingle();
    const openness = (
      existing as { cosmetic_procedure_openness: string | null } | null
    )?.cosmetic_procedure_openness;
    const alreadyUnlocked = (
      existing as { stage_4_unlocked_at: string | null } | null
    )?.stage_4_unlocked_at;
    if (
      !alreadyUnlocked &&
      openness &&
      UNLOCK_OPENNESS.includes(openness)
    ) {
      update.stage_4_unlocked_at = now;
    }
  } else if (stage === 3 && action === 'ack') {
    update.stage_3_acknowledged_at = now;
  } else if (stage === 4 && action === 'ack') {
    update.stage_4_acknowledged_at = now;
  } else {
    return NextResponse.json(
      { error: 'invalid_stage_action_combination' },
      { status: 400 },
    );
  }

  const { error } = await supabase
    .from('facial_structure_assessments')
    .update(update)
    .eq('user_id', user.id);
  if (error) {
    return NextResponse.json(
      { error: 'save_failed', message: error.message },
      { status: 500 },
    );
  }
  return NextResponse.json({ ok: true });
}
