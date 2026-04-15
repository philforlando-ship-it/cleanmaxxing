/**
 * Weekly reflection email cron (spec §2.5 stickiness 5a).
 *
 * Vercel cron config in vercel.json hits this endpoint at 6pm Sunday UTC.
 * The route:
 *   1. Authorizes the call via CRON_SECRET (Vercel attaches it as a
 *      Bearer token; local calls can pass ?secret=... as a fallback).
 *   2. Scans every user whose onboarding is complete and subscription is
 *      active or trial.
 *   3. For each, composes weekly data via computeWeeklyEmailData and
 *      sends via Resend.
 *   4. Gates the actual send on RESEND_API_KEY — if empty, logs a dry-run
 *      line and returns a dry-run count so the route is safe to hit
 *      locally before the key is provisioned.
 */
import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createServiceClient } from '@/lib/supabase/server';
import {
  computeWeeklyEmailData,
  renderWeeklyEmail,
} from '@/lib/email/weekly-reflection-email';

export const maxDuration = 300;

type SendResult = {
  user_id: string;
  email: string;
  status: 'sent' | 'dry_run' | 'skipped' | 'error';
  reason?: string;
};

export async function GET(req: NextRequest) {
  const authorized = isAuthorized(req);
  if (!authorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const service = createServiceClient();
  const resendKey = process.env.RESEND_API_KEY?.trim();
  const fromEmail = process.env.RESEND_FROM_EMAIL?.trim() || 'noreply@cleanmaxxing.com';
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL?.trim() || 'https://cleanmaxxing.com';
  const dryRun = !resendKey;
  const resend = resendKey ? new Resend(resendKey) : null;

  // Pull eligible users. Subscription gate: trial or active. Skip users
  // who haven't finished onboarding — nothing useful to say yet.
  const { data: profiles, error: profilesError } = await service
    .from('users')
    .select('id, subscription_status, onboarding_completed_at, tracking_paused_at')
    .not('onboarding_completed_at', 'is', null)
    .in('subscription_status', ['trial', 'active']);

  if (profilesError) {
    return NextResponse.json({ error: profilesError.message }, { status: 500 });
  }

  const results: SendResult[] = [];
  for (const profile of profiles ?? []) {
    // Step-away mode (spec §13): don't email users who have paused tracking.
    if (profile.tracking_paused_at) {
      results.push({
        user_id: profile.id as string,
        email: '',
        status: 'skipped',
        reason: 'step_away',
      });
      continue;
    }

    // Fetch auth email separately — auth.users is not joinable from the
    // public schema in Supabase without an explicit view.
    const { data: authUser, error: authError } =
      await service.auth.admin.getUserById(profile.id as string);
    if (authError || !authUser?.user?.email) {
      results.push({
        user_id: profile.id as string,
        email: '',
        status: 'skipped',
        reason: 'no_email',
      });
      continue;
    }
    const email = authUser.user.email;

    try {
      const data = await computeWeeklyEmailData(
        service as unknown as Parameters<typeof computeWeeklyEmailData>[0],
        profile.id as string
      );
      const rendered = renderWeeklyEmail(data, appUrl);

      if (dryRun || !resend) {
        results.push({ user_id: profile.id as string, email, status: 'dry_run' });
        continue;
      }

      await resend.emails.send({
        from: fromEmail,
        to: email,
        subject: rendered.subject,
        html: rendered.html,
        text: rendered.text,
      });
      results.push({ user_id: profile.id as string, email, status: 'sent' });
    } catch (err) {
      results.push({
        user_id: profile.id as string,
        email,
        status: 'error',
        reason: (err as Error).message,
      });
    }
  }

  const summary = {
    total: results.length,
    sent: results.filter((r) => r.status === 'sent').length,
    dry_run: results.filter((r) => r.status === 'dry_run').length,
    skipped: results.filter((r) => r.status === 'skipped').length,
    errors: results.filter((r) => r.status === 'error').length,
    dry_run_mode: dryRun,
  };

  return NextResponse.json({ summary, results });
}

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  // In local dev with no secret set, allow. In production (Vercel sets
  // NODE_ENV=production), require the secret to match.
  if (!secret) return process.env.NODE_ENV !== 'production';

  const auth = req.headers.get('authorization');
  if (auth === `Bearer ${secret}`) return true;
  const querySecret = req.nextUrl.searchParams.get('secret');
  if (querySecret === secret) return true;
  return false;
}
