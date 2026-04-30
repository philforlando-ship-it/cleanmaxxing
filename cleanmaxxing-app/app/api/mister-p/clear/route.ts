// Clears a Mister P chat thread. Hard-deletes every mister_p_queries
// row matching (user_id, goal_id). Confirmed-delete behavior was the
// user's explicit choice over a soft-clear flag — "clear" should
// mean gone. A null goal_id targets the General thread (rows with
// goal_id IS NULL); a UUID targets that specific goal's thread.

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

const RequestSchema = z.object({
  goal_id: z.string().uuid().nullable(),
});

export async function POST(req: NextRequest) {
  const parsed = RequestSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
  const { goal_id } = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (goal_id) {
    // Verify the goal belongs to this user before clearing its thread.
    // RLS on mister_p_queries already restricts to the caller's user_id,
    // so a foreign goal_id can't cross-delete in the worst case — but
    // an explicit 404 is clearer than a silent 0-row delete and
    // surfaces the case where a stale goal_id is sent from a stale tab.
    const { data: ownedGoal } = await supabase
      .from('goals')
      .select('id')
      .eq('id', goal_id)
      .eq('user_id', user.id)
      .maybeSingle();
    if (!ownedGoal) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 });
    }

    const { error } = await supabase
      .from('mister_p_queries')
      .delete()
      .eq('user_id', user.id)
      .eq('goal_id', goal_id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  } else {
    // General thread (goal_id IS NULL). No ownership check needed —
    // RLS already constrains delete to this user's rows.
    const { error } = await supabase
      .from('mister_p_queries')
      .delete()
      .eq('user_id', user.id)
      .is('goal_id', null);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}
