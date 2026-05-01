/**
 * Weekly letter cron — Sunday morning. Vercel cron config in
 * vercel.json hits this at Sunday 13:00 UTC (roughly 8am ET /
 * 5am PT). For each onboarded, active/trial user not in
 * step-away mode, generate a Mister P letter and upsert into
 * weekly_letters keyed by (user_id, week_start).
 *
 * Auth model mirrors weekly-email/route.ts: CRON_SECRET via
 * Bearer header in production, optional ?secret= param locally.
 *
 * Failure isolation: per-user errors are recorded in the result
 * summary but do not abort the loop. A bad LLM call for one user
 * shouldn't drop letters for everyone else.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { composeWeeklyLetter } from '@/lib/weekly-letter/compose';
import { weekStartIso } from '@/lib/weekly-letter/service';

export const maxDuration = 300;

type Result = {
  user_id: string;
  status: 'written' | 'skipped' | 'error';
  reason?: string;
};

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const service = createServiceClient();
  const now = new Date();
  const weekStart = weekStartIso(now);

  const { data: profiles, error: profilesError } = await service
    .from('users')
    .select('id, subscription_status, onboarding_completed_at, tracking_paused_at')
    .not('onboarding_completed_at', 'is', null)
    .in('subscription_status', ['trial', 'active']);

  if (profilesError) {
    return NextResponse.json({ error: profilesError.message }, { status: 500 });
  }

  const results: Result[] = [];
  for (const profile of profiles ?? []) {
    const userId = profile.id as string;
    if (profile.tracking_paused_at) {
      results.push({ user_id: userId, status: 'skipped', reason: 'step_away' });
      continue;
    }

    // Skip if a letter for this week already exists — re-runs of
    // the cron (manual trigger, retry) shouldn't pay the LLM cost
    // a second time.
    const { data: existing } = await service
      .from('weekly_letters')
      .select('id')
      .eq('user_id', userId)
      .eq('week_start', weekStart)
      .maybeSingle();
    if (existing) {
      results.push({ user_id: userId, status: 'skipped', reason: 'already_written' });
      continue;
    }

    try {
      const body = await composeWeeklyLetter(
        service as unknown as Parameters<typeof composeWeeklyLetter>[0],
        userId,
        now,
      );
      const { error: insertError } = await service
        .from('weekly_letters')
        .insert({ user_id: userId, week_start: weekStart, body });
      if (insertError) {
        results.push({ user_id: userId, status: 'error', reason: insertError.message });
        continue;
      }
      results.push({ user_id: userId, status: 'written' });
    } catch (err) {
      results.push({
        user_id: userId,
        status: 'error',
        reason: (err as Error).message,
      });
    }
  }

  const summary = {
    week_start: weekStart,
    total: results.length,
    written: results.filter((r) => r.status === 'written').length,
    skipped: results.filter((r) => r.status === 'skipped').length,
    errors: results.filter((r) => r.status === 'error').length,
  };

  return NextResponse.json({ summary, results });
}

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV !== 'production';
  const auth = req.headers.get('authorization');
  if (auth === `Bearer ${secret}`) return true;
  if (req.nextUrl.searchParams.get('secret') === secret) return true;
  return false;
}
