// "Stay with foundations first" — the user has chosen NOT to enable
// execution mode but has explicitly acknowledged the prompt, so the
// enforcing banner should stop blocking the chat input. Sets
// chat_execution_prompt_acked=true on the goal without touching
// chat_execution_mode (which stays at its current value, almost
// always false in this code path).
//
// Pairs with /api/mister-p/execution-mode, which is the "Help me
// anyway" path. Both endpoints are required: a single endpoint with
// an "enabled" flag would conflate "user chose foundations" with
// "user explicitly turned execution mode off after enabling it,"
// which is a different state transition we don't need to model
// separately.

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

const RequestSchema = z.object({
  goal_id: z.string().uuid(),
});

export async function POST(req: NextRequest) {
  const parsed = RequestSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { goal_id } = parsed.data;

  const { data: ownedGoal } = await supabase
    .from('goals')
    .select('id')
    .eq('id', goal_id)
    .eq('user_id', user.id)
    .maybeSingle();
  if (!ownedGoal) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const { error } = await supabase
    .from('goals')
    .update({ chat_execution_prompt_acked: true })
    .eq('id', goal_id)
    .eq('user_id', user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
