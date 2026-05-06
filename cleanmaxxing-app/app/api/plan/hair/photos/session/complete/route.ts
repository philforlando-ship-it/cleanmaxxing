// POST /api/plan/hair/photos/session/complete
// Closes the user's open hair photo session. Required before the
// session counts toward Stage 5 progress and before it becomes
// eligible for AI analysis comparison.
//
// Also fires the existing logHairRoutineForToday-equivalent for Stage 5
// — completing an upload-backed session should bump the same Stage 5
// counters as the self-attest button.

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import {
  completeHairSession,
  getOpenHairSession,
} from '@/lib/hair/photos/service';
import { logStage5Session } from '@/lib/hair/service';

const RequestSchema = z.object({
  notes: z.string().max(500).nullable().optional(),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const open = await getOpenHairSession(supabase, user.id);
  if (!open) {
    return NextResponse.json(
      { error: 'No open session to complete.' },
      { status: 400 },
    );
  }

  try {
    await completeHairSession(
      supabase,
      user.id,
      open.id,
      parsed.data.notes ?? null,
    );
    // Bump Stage 5 counters. Service-level dedup (24h window) prevents
    // double-counting if the user also tapped the self-attest button
    // recently.
    await logStage5Session(supabase, user.id);
  } catch (err) {
    console.error('hair_photos_session_complete_failed', err);
    return NextResponse.json(
      { error: 'Could not complete the session.' },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, session_id: open.id });
}
