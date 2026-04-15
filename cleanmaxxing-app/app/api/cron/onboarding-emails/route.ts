/**
 * Onboarding email sequence cron (spec §9 Week 5).
 *
 * Fires daily. For each eligible trial user:
 *   - computes days-since-signup
 *   - picks the step (day_3 / day_7 / day_14) matching that age
 *   - skips if the step was already sent (user_email_events dedupe)
 *   - sends via Resend when RESEND_API_KEY is set, otherwise dry-runs
 *   - writes a user_email_events row on success
 *
 * The welcome (day_0) email is NOT handled here — it fires directly from
 * the auth signup route so it lands within seconds of signup.
 */
import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createServiceClient } from '@/lib/supabase/server';
import {
  renderOnboardingEmail,
  hasStepBeenSent,
  markStepSent,
  type OnboardingStep,
} from '@/lib/email/onboarding-sequence';

export const maxDuration = 300;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

type SendResult = {
  user_id: string;
  email: string;
  step: OnboardingStep | null;
  status: 'sent' | 'dry_run' | 'skipped' | 'error';
  reason?: string;
};

function stepForAge(daysSinceSignup: number): OnboardingStep | null {
  // Day counts are floor()'d above, so day 3 = anywhere in [3, 4) days.
  // Each step fires on its canonical day and is deduped by the events log.
  if (daysSinceSignup === 3) return 'day_3';
  if (daysSinceSignup === 7) return 'day_7';
  if (daysSinceSignup === 14) return 'day_14';
  return null;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const service = createServiceClient();
  const resendKey = process.env.RESEND_API_KEY?.trim();
  const fromEmail =
    process.env.RESEND_FROM_EMAIL?.trim() || 'noreply@cleanmaxxing.com';
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL?.trim() || 'https://cleanmaxxing.com';
  const dryRun = !resendKey;
  const resend = resendKey ? new Resend(resendKey) : null;

  const { data: profiles, error } = await service
    .from('users')
    .select(
      'id, created_at, subscription_status, tracking_paused_at, onboarding_completed_at'
    )
    .eq('subscription_status', 'trial');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const now = Date.now();
  const results: SendResult[] = [];

  for (const profile of profiles ?? []) {
    const userId = profile.id as string;

    if (profile.tracking_paused_at) {
      results.push({
        user_id: userId,
        email: '',
        step: null,
        status: 'skipped',
        reason: 'step_away',
      });
      continue;
    }

    const createdAt = profile.created_at
      ? new Date(profile.created_at as string).getTime()
      : now;
    const days = Math.floor((now - createdAt) / MS_PER_DAY);
    const step = stepForAge(days);
    if (!step) {
      results.push({
        user_id: userId,
        email: '',
        step: null,
        status: 'skipped',
        reason: `day_${days}_no_step`,
      });
      continue;
    }

    const alreadySent = await hasStepBeenSent(
      service as unknown as Parameters<typeof hasStepBeenSent>[0],
      userId,
      step
    );
    if (alreadySent) {
      results.push({
        user_id: userId,
        email: '',
        step,
        status: 'skipped',
        reason: 'already_sent',
      });
      continue;
    }

    const { data: authUser, error: authErr } =
      await service.auth.admin.getUserById(userId);
    if (authErr || !authUser?.user?.email) {
      results.push({
        user_id: userId,
        email: '',
        step,
        status: 'skipped',
        reason: 'no_email',
      });
      continue;
    }
    const email = authUser.user.email;

    try {
      const rendered = renderOnboardingEmail(step, appUrl);

      if (dryRun || !resend) {
        results.push({ user_id: userId, email, step, status: 'dry_run' });
        // Mark sent even in dry run so the endpoint is idempotent locally —
        // otherwise hitting it repeatedly keeps firing the same step.
        await markStepSent(
          service as unknown as Parameters<typeof markStepSent>[0],
          userId,
          step
        );
        continue;
      }

      await resend.emails.send({
        from: fromEmail,
        to: email,
        subject: rendered.subject,
        html: rendered.html,
        text: rendered.text,
      });
      await markStepSent(
        service as unknown as Parameters<typeof markStepSent>[0],
        userId,
        step
      );
      results.push({ user_id: userId, email, step, status: 'sent' });
    } catch (err) {
      results.push({
        user_id: userId,
        email,
        step,
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
  if (!secret) return process.env.NODE_ENV !== 'production';
  const auth = req.headers.get('authorization');
  if (auth === `Bearer ${secret}`) return true;
  const querySecret = req.nextUrl.searchParams.get('secret');
  if (querySecret === secret) return true;
  return false;
}
