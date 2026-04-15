/**
 * Onboarding email sequence (spec §9 Week 5).
 *
 * Four emails across the 14-day trial:
 *   day 0  — welcome (fired immediately on signup, outside the cron)
 *   day 3  — check-in / "how are the first 72 hours"
 *   day 7  — halfway / confidence trend reminder
 *   day 14 — trial ending / convert-or-lose-access
 *
 * The day-3/7/14 emails are picked up by the daily cron, which scans
 * users whose signup age matches and whose sequence step hasn't been
 * sent yet. Each step is idempotent — resending is safe, the dedupe is
 * handled at the `user_email_events` row level.
 *
 * Day-0 welcome is fired directly from the auth signup route (hotter path,
 * wants to land within seconds of signup), not from the cron.
 */
import type { SupabaseClient } from '@supabase/supabase-js';

export type OnboardingStep = 'welcome' | 'day_3' | 'day_7' | 'day_14';

type EmailContent = {
  subject: string;
  html: string;
  text: string;
};

const CTA_OPEN = 'Open Cleanmaxxing';
const FOOTER_SIGNED = '— Mister P';

export function renderOnboardingEmail(
  step: OnboardingStep,
  appUrl: string
): EmailContent {
  switch (step) {
    case 'welcome':
      return composeEmail({
        subject: 'You\u2019re in. Here\u2019s how this works.',
        paragraphs: [
          'Welcome. Cleanmaxxing is a structured, honest self-improvement platform for men who want to look and feel better without the radioactive parts of the category. You just started the 14-day free trial — no credit card, nothing to cancel unless you decide it\u2019s worth it.',
          'The loop is simple. Ten seconds a day to check in on your goals. Sixty seconds on Sunday to reflect on how the week actually went, across four dimensions instead of one global self-worth rating. Mister P is the chat assistant — direct, a little dry, willing to tell you when something isn\u2019t worth your time.',
          'One thing most products in this category won\u2019t say out loud: we\u2019re not trying to be your whole identity. There are other ways to build self-confidence — therapy, relationships, purpose, physical attributes. We own the fourth and acknowledge the other three as real. That\u2019s baked into the framework on purpose.',
        ],
        ctaHref: `${appUrl}/today`,
        ctaLabel: 'Open your Today screen',
      });

    case 'day_3':
      return composeEmail({
        subject: 'Three days in — the hard part',
        paragraphs: [
          'You\u2019re three days into the trial. If the check-ins have felt easy so far, that\u2019s normal — the first few days always do. The hard part is day 4 through day 10, when the novelty wears off and the system has to hold up on its own.',
          'If you\u2019ve missed a day or two, that\u2019s also normal. The point isn\u2019t a clean streak. The point is whether the framework is pointing you at the right things to work on. If it\u2019s not, use the library to swap goals — there\u2019s no penalty for changing your mind.',
          'One thing worth trying if you haven\u2019t yet: ask Mister P something you\u2019ve been wondering about. A skincare thing, a training thing, a hair thing. He\u2019ll answer from the corpus and tell you what actually matters.',
        ],
        ctaHref: `${appUrl}/today`,
        ctaLabel: CTA_OPEN,
      });

    case 'day_7':
      return composeEmail({
        subject: 'Halfway through the trial',
        paragraphs: [
          'A week in. If you\u2019ve saved at least one weekly reflection by now, your confidence chart has a first data point — which is not very interesting on its own, but starts becoming interesting around week 3.',
          'The most valuable thing to do this week: finish the weekly reflection if you haven\u2019t yet. Four sliders, a minute of your time. It\u2019s the one surface that tracks the trend without training you to rate yourself daily, and the chart is the piece that will either convince you this is worth paying for or convince you it isn\u2019t.',
          'If the goals you started with don\u2019t feel right anymore, swap them. A week of trying something is enough data to know whether it\u2019s the right layer for you right now.',
        ],
        ctaHref: `${appUrl}/today`,
        ctaLabel: CTA_OPEN,
      });

    case 'day_14':
      return composeEmail({
        subject: 'Your trial ends tomorrow',
        paragraphs: [
          'The 14-day free trial ends tomorrow. No card was ever charged, nothing auto-renews, and there\u2019s no dark pattern on the way out.',
          'If the system has been useful — if the check-ins are holding, if the weekly chart shows a direction, if Mister P has told you something you didn\u2019t already know — then this is the moment. $9.99/month, or $79/year if you want to commit. Either price, same product.',
          'If it hasn\u2019t been useful, walk away. We\u2019d rather you leave now than stay on something that isn\u2019t earning its keep. Your data stays yours. If you come back later, your goals and history will still be here.',
        ],
        ctaHref: `${appUrl}/settings/billing`,
        ctaLabel: 'Keep going',
      });
  }
}

type ComposeInput = {
  subject: string;
  paragraphs: string[];
  ctaHref: string;
  ctaLabel: string;
};

function composeEmail({
  subject,
  paragraphs,
  ctaHref,
  ctaLabel,
}: ComposeInput): EmailContent {
  const text = [
    ...paragraphs,
    '',
    `${ctaLabel}: ${ctaHref}`,
    '',
    FOOTER_SIGNED,
  ].join('\n\n');

  const htmlParagraphs = paragraphs
    .map(
      (p) =>
        `<p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.6; color: #18181b;">${escapeHtml(
          p
        )}</p>`
    )
    .join('');

  const html = `<!doctype html>
<html>
  <body style="margin: 0; padding: 24px; background: #fafafa; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
    <div style="max-width: 560px; margin: 0 auto; background: #ffffff; padding: 32px; border-radius: 12px; border: 1px solid #e4e4e7;">
      <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: #71717a; margin-bottom: 8px;">Cleanmaxxing</div>
      ${htmlParagraphs}
      <a href="${ctaHref}" style="display: inline-block; margin-top: 8px; padding: 10px 16px; background: #18181b; color: #ffffff; text-decoration: none; border-radius: 8px; font-size: 14px; font-weight: 500;">${escapeHtml(
        ctaLabel
      )}</a>
      <div style="margin-top: 32px; font-size: 12px; color: #a1a1aa;">${FOOTER_SIGNED}</div>
    </div>
  </body>
</html>`;

  return { subject, html, text };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Dedupe check — returns true if this step has already been logged as
 * sent for this user. Writes to a `user_email_events` table (created in
 * migration 0006 below).
 */
export async function hasStepBeenSent(
  supabase: SupabaseClient,
  userId: string,
  step: OnboardingStep
): Promise<boolean> {
  const { data } = await supabase
    .from('user_email_events')
    .select('id')
    .eq('user_id', userId)
    .eq('event_key', `onboarding_${step}`)
    .maybeSingle();
  return !!data;
}

export async function markStepSent(
  supabase: SupabaseClient,
  userId: string,
  step: OnboardingStep
): Promise<void> {
  await supabase.from('user_email_events').insert({
    user_id: userId,
    event_key: `onboarding_${step}`,
  });
}
