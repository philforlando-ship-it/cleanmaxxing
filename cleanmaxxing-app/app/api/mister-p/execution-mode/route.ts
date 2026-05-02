// Toggles the per-goal Mister P execution mode flag. When enabled,
// Mister P's per-turn system prompt skips foundation-first redirects
// on that goal's chat thread and engages with the goal directly.
// See lib/mister-p/prompt.ts EXECUTION_MODE_ADVISORY for behavior.
//
// Authorization: the goal_id must belong to the requesting user.
// Mismatches return 404 (not 403) to avoid leaking the existence of
// other users' goals to a probing client.

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

const RequestSchema = z.object({
  goal_id: z.string().uuid(),
  enabled: z.boolean(),
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

  const { goal_id, enabled } = parsed.data;

  // Verify ownership before writing. The update query below is
  // already user-scoped via .eq('user_id', user.id), but checking
  // first lets us return a clean 404 for unknown goals rather than
  // an opaque "no rows updated" success.
  const { data: ownedGoal } = await supabase
    .from('goals')
    .select('id')
    .eq('id', goal_id)
    .eq('user_id', user.id)
    .maybeSingle();
  if (!ownedGoal) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // Flipping mode also implicitly acks the prompt — you cannot
  // interact with the toggle without having seen it. Setting both
  // here prevents a UI race where the user clicks "Help me anyway"
  // but the enforcing banner re-shows on next render because
  // chat_execution_prompt_acked is still false.
  const { error } = await supabase
    .from('goals')
    .update({
      chat_execution_mode: enabled,
      chat_execution_prompt_acked: true,
    })
    .eq('id', goal_id)
    .eq('user_id', user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, enabled });
}
