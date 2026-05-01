// Saves a single first-conversation answer. POST repeatedly as
// the user moves through the questions; the final POST includes
// completed=true which writes the completion marker so the card
// stops rendering.
//
// Survey_responses has no unique constraint on (user_id,
// question_key), so we follow the established pattern: delete
// existing rows for the key, then insert. That mirrors how the
// onboarding submit and quarterly re-survey writes work today.

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { FIRST_CONVO_KEYS } from '@/lib/first-convo/service';

const ALLOWED_KEYS = new Set<string>([
  FIRST_CONVO_KEYS.blockers,
  FIRST_CONVO_KEYS.triedBefore,
]);

const RequestSchema = z.object({
  key: z.string(),
  value: z.string().min(1).max(1000),
  completed: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  const parsed = RequestSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success || !ALLOWED_KEYS.has(parsed.data.key)) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { key, value, completed } = parsed.data;
  const trimmed = value.trim();

  // Delete-then-insert for the answered key.
  await supabase
    .from('survey_responses')
    .delete()
    .eq('user_id', user.id)
    .eq('question_key', key);
  const { error } = await supabase.from('survey_responses').insert({
    user_id: user.id,
    question_key: key,
    response_value: trimmed,
  });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (completed) {
    await supabase
      .from('survey_responses')
      .delete()
      .eq('user_id', user.id)
      .eq('question_key', FIRST_CONVO_KEYS.completedAt);
    const { error: markerErr } = await supabase
      .from('survey_responses')
      .insert({
        user_id: user.id,
        question_key: FIRST_CONVO_KEYS.completedAt,
        response_value: new Date().toISOString(),
      });
    if (markerErr) {
      return NextResponse.json({ error: markerErr.message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}
