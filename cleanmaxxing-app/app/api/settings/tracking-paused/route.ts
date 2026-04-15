/**
 * Step-away mode toggle (spec §13 psychological safety).
 *
 * POST body: { paused: boolean }
 * - paused: true  → sets users.tracking_paused_at = now()
 * - paused: false → sets users.tracking_paused_at = null
 *
 * Goals and history are never touched. The step-away state is respected
 * by the weekly-email cron and the onboarding-email cron (both skip
 * paused users), and by the Today screen, which hides the daily check-in
 * and weekly reflection cards behind a "stepped away" banner.
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

const BodySchema = z.object({
  paused: z.boolean(),
});

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const parsed = BodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const { error } = await supabase
    .from('users')
    .update({
      tracking_paused_at: parsed.data.paused ? new Date().toISOString() : null,
    })
    .eq('id', user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ paused: parsed.data.paused });
}
