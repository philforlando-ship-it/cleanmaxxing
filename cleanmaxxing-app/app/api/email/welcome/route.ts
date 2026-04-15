/**
 * Welcome email trigger (spec §9 Week 5 onboarding sequence — day 0).
 *
 * Called from the client immediately after supabase.auth.signUp succeeds.
 * Fire-and-forget from the UI — it must not block the router push to
 * /onboarding, so errors are logged server-side and returned as 200 so
 * the client doesn't retry.
 *
 * Dedupes via user_email_events so repeat calls are safe.
 */
import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import {
  renderOnboardingEmail,
  hasStepBeenSent,
  markStepSent,
} from '@/lib/email/onboarding-sequence';

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) {
    return NextResponse.json({ status: 'no_user' });
  }

  const service = createServiceClient();
  const alreadySent = await hasStepBeenSent(
    service as unknown as Parameters<typeof hasStepBeenSent>[0],
    user.id,
    'welcome'
  );
  if (alreadySent) return NextResponse.json({ status: 'already_sent' });

  const resendKey = process.env.RESEND_API_KEY?.trim();
  const fromEmail =
    process.env.RESEND_FROM_EMAIL?.trim() || 'noreply@cleanmaxxing.com';
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL?.trim() || 'https://cleanmaxxing.com';

  const rendered = renderOnboardingEmail('welcome', appUrl);

  if (!resendKey) {
    // Dry-run: mark as sent so repeats are idempotent in dev, but don't
    // actually call Resend.
    await markStepSent(
      service as unknown as Parameters<typeof markStepSent>[0],
      user.id,
      'welcome'
    );
    return NextResponse.json({ status: 'dry_run' });
  }

  try {
    const resend = new Resend(resendKey);
    await resend.emails.send({
      from: fromEmail,
      to: user.email,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
    });
    await markStepSent(
      service as unknown as Parameters<typeof markStepSent>[0],
      user.id,
      'welcome'
    );
    return NextResponse.json({ status: 'sent' });
  } catch (err) {
    console.error('welcome email send failed', err);
    return NextResponse.json({ status: 'error' });
  }
}
