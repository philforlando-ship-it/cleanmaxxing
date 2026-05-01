// Hourly cron — sends daily check-in reminders + Sunday reflection
// prompts to subscribed users at their preferred local hour. Runs
// best every hour on the hour; the de-dup guard
// (last_reminder_at > 20h ago) means an extra invocation is
// harmless. Vercel cron config: hourly. Supabase scheduled
// function: invoke this URL with the cron secret in the
// Authorization header.
//
// No content per spec: no streak language, no fire emojis, no
// "you're on a roll." Just a neutral nudge that the surface
// exists. Sunday gets the reflection variant; other days get the
// check-in variant.

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import {
  sendPush,
  localHourFor,
  localDayOfWeekFor,
  type StoredSubscription,
} from '@/lib/push/service';

// Min hours since last_reminder_at before sending again. Set
// well under 24 so even a slightly slow cron still hits the
// user's preferred hour, but well over an hour so two close
// invocations don't double-send.
const MIN_HOURS_BETWEEN_REMINDERS = 20;

export async function GET(req: NextRequest) {
  // Cron secret check — Vercel cron sends a deterministic header
  // we can verify against an env var. Mirrors the existing
  // /api/cron/weekly-email pattern.
  const cronSecret = process.env.CRON_SECRET?.trim();
  if (cronSecret) {
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const service = createServiceClient();

  const { data: subs, error } = await service
    .from('push_subscriptions')
    .select(
      'id, user_id, endpoint, p256dh, auth, timezone, reminder_hour, last_reminder_at',
    );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const now = new Date();
  const nowMs = now.getTime();

  let sent = 0;
  let skipped = 0;
  let pruned = 0;
  let failed = 0;

  for (const raw of subs ?? []) {
    const sub = raw as unknown as StoredSubscription;

    // Hour-match gate.
    const localHour = localHourFor(sub.timezone, now);
    if (localHour !== sub.reminder_hour) {
      skipped++;
      continue;
    }

    // De-dup gate.
    if (sub.last_reminder_at) {
      const last = new Date(sub.last_reminder_at).getTime();
      const hoursSince = (nowMs - last) / 3_600_000;
      if (hoursSince < MIN_HOURS_BETWEEN_REMINDERS) {
        skipped++;
        continue;
      }
    }

    // Sunday reflection vs daily check-in. Day 0 = Sunday in JS
    // and in our localDayOfWeekFor helper.
    const isSunday = localDayOfWeekFor(sub.timezone, now) === 0;
    const payload = isSunday
      ? {
          title: 'Sunday reflection',
          body: 'A minute on how the week actually went.',
          url: '/today',
          tag: 'cleanmaxxing-reflection',
        }
      : {
          title: 'Cleanmaxxing',
          body: "Today's check-in is waiting.",
          url: '/today',
          tag: 'cleanmaxxing-checkin',
        };

    const result = await sendPush(sub, payload);
    if (result.ok) {
      sent++;
      await service
        .from('push_subscriptions')
        .update({ last_reminder_at: new Date().toISOString() })
        .eq('id', sub.id);
    } else if (result.gone) {
      pruned++;
      await service.from('push_subscriptions').delete().eq('id', sub.id);
    } else {
      failed++;
    }
  }

  return NextResponse.json({
    ok: true,
    sent,
    skipped,
    pruned,
    failed,
    total: subs?.length ?? 0,
  });
}
