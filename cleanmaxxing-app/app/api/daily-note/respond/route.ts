// Saves the user's response to today's daily note. The card
// passes the row id so we don't need to recompute "what's
// today's note?" server-side; the caller already loaded it on
// page render. Locked to the caller's user_id via the row's
// FK + RLS, so a stray id from another user can't write.

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

const RequestSchema = z.object({
  note_id: z.string().uuid(),
  response: z.string().min(1).max(1000),
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

  const { note_id, response } = parsed.data;

  const { error } = await supabase
    .from('daily_notes')
    .update({
      response: response.trim(),
      responded_at: new Date().toISOString(),
    })
    .eq('id', note_id)
    .eq('user_id', user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
