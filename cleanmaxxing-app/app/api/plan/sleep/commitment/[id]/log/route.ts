// POST /api/plan/sleep/commitment/[id]/log
// Toggle today's adherence record for a single sleep commitment.
// Idempotent — the route accepts the explicit completed boolean, so
// the client can flip it both ways without ambiguity.
//
// Request body:
//   { completed: boolean }
// Response:
//   { ok: true, log: { id, app_day, completed } }

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { setCommitmentLog } from '@/lib/sleep/commitments';
import { appDayFor } from '@/lib/date/app-day';

const RequestSchema = z.object({
  completed: z.boolean(),
});

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id: commitmentId } = await ctx.params;
  if (!commitmentId) {
    return NextResponse.json(
      { error: 'missing_commitment_id' },
      { status: 400 },
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid_request', issues: parsed.error.issues },
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

  // Verify the commitment belongs to this user — RLS would catch a
  // mismatch on the log insert, but the explicit check yields a
  // cleaner error path.
  const { data: commitmentRow } = await supabase
    .from('sleep_commitments')
    .select('id')
    .eq('id', commitmentId)
    .eq('user_id', user.id)
    .maybeSingle();
  if (!commitmentRow) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  // App-day in the user's timezone — same convention as hair stage-4
  // logs and sleep_logs.night_of.
  const { data: userRow } = await supabase
    .from('users')
    .select('timezone')
    .eq('id', user.id)
    .maybeSingle();
  const tz =
    (userRow as { timezone: string | null } | null)?.timezone ??
    'America/New_York';
  const appDay = appDayFor(tz);

  try {
    const log = await setCommitmentLog(
      supabase,
      user.id,
      commitmentId,
      appDay,
      parsed.data.completed,
    );
    return NextResponse.json({
      ok: true,
      log: {
        id: log.id,
        app_day: log.app_day,
        completed: log.completed,
      },
    });
  } catch (err) {
    console.error('sleep_commitment_log_failed', err);
    return NextResponse.json(
      { error: 'log_failed', message: (err as Error).message },
      { status: 500 },
    );
  }
}
