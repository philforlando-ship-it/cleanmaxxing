// Persists a web-push subscription for the authenticated user. The
// browser's PushManager.subscribe() returns a SubscriptionJSON
// object; we extract the endpoint + cryptographic keys, plus the
// browser's timezone so the cron can fire reminders in local time.
// Upserts on (user_id, endpoint) so re-subscribing from the same
// device updates rather than duplicates.

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

const RequestSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
  timezone: z.string().min(1).max(64).optional(),
  reminder_hour: z.number().int().min(0).max(23).optional(),
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

  const { endpoint, keys, timezone, reminder_hour } = parsed.data;

  const row = {
    user_id: user.id,
    endpoint,
    p256dh: keys.p256dh,
    auth: keys.auth,
    timezone: timezone ?? 'UTC',
    reminder_hour: reminder_hour ?? 20,
    last_used_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from('push_subscriptions')
    .upsert(row, { onConflict: 'user_id,endpoint' });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
