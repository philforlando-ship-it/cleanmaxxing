/**
 * Onboarding email sequence (spec §9 Week 5).
 *
 * Four emails over the user's first two weeks:
 *   day 0  — welcome (fired immediately on signup, outside the cron)
 *   day 3  — check-in / "how are the first 72 hours"
 *   day 7  — week one / weekly reflection nudge
 *   day 14 — two weeks in / what to look for next
 *
 * The day-3/7/14 emails are picked up by the daily cron, which scans
 * users whose signup age matches and whose sequence step hasn't been
 * sent yet. Each step is idempotent — resending is safe, the dedupe is
 * handled at the `user_email_events` row level.
 *
 * Day-0 welcome is fired directly from the auth signup route (hotter path,
 * wants to land within seconds of signup), not from the cron.
 *
 * Refreshed 2026-05-09 for the free-app reframe (no trial countdown,
 * no $9.99 conversion event) AND to match Weekly Reflection v2 — the
 * old "four sliders, one minute" copy was retired when the v2 form
 * shipped (process adherence per active journey + outcome questions).
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
        subject: 'You’re in. Here’s how this works.',
        paragraphs: [
          'Welcome. Cleanmaxxing is a structured, honest self-improvement platform for men who want to look and feel better without the radioactive parts of the category. Free to use, no credit card, nothing to cancel unless you decide it’s not for you.',
          'The loop is simple. Ten seconds a day on the daily check-in. A couple of minutes on Sunday on the weekly reflection — process adherence per active journey, plus a few outcome questions on what actually changed. Mister P is the chat assistant — direct, a little dry, willing to tell you when something isn’t worth your time.',
          'One thing most products in this category won’t say out loud: we’re not trying to be your whole identity. There are other ways to build self-confidence — therapy, relationships, purpose, physical attributes. We own the fourth and acknowledge the other three as real. That’s baked into the framework on purpose.',
        ],
        ctaHref: `${appUrl}/today`,
        ctaLabel: 'Open your Today screen',
      });

    case 'day_3':
      return composeEmail({
        subject: 'Three days in — the hard part',
        paragraphs: [
          'You’re three days in. If the check-ins have felt easy so far, that’s normal — the first few days always do. The hard part is day 4 through day 10, when the novelty wears off and the system has to hold up on its own.',
          'If you’ve skipped a day, the move is simple: open the app, tick whatever you actually did today, close it. Ten seconds, no streak to worry about. And if the journey you picked doesn’t feel right, /today shows all eight — pick a different one. A few days is enough data to know.',
          'One thing worth trying if you haven’t yet: ask Mister P something you’ve been wondering about. A skincare thing, a training thing, a hair thing. He’ll answer from the corpus and tell you what actually matters.',
        ],
        ctaHref: `${appUrl}/today`,
        ctaLabel: CTA_OPEN,
      });

    case 'day_7':
      return composeEmail({
        subject: 'Week one — what the chart is for',
        paragraphs: [
          'A week in. If you’ve saved at least one weekly reflection by now, the process-adherence chart has a first data point — not very interesting on its own, but starts becoming readable around week 3.',
          'The most valuable thing to do this week: finish the weekly reflection if you haven’t yet. Two minutes — process adherence per active journey, a few questions on what actually changed in the world, one directional flag. You report what happened; the app doesn’t ask you to rate yourself. Find it at /reflection.',
          'If a journey isn’t earning its keep, swap it. A week of trying something is enough data to know whether it’s the right layer for you right now.',
        ],
        ctaHref: `${appUrl}/reflection`,
        ctaLabel: 'Open Reflection',
      });

    case 'day_14':
      return composeEmail({
        subject: 'Two weeks in — what to look for next',
        paragraphs: [
          'You’ve been at this two weeks. Long enough that the chart starts having something to say, short enough that nothing visible has changed yet — that’s the normal shape of the next month.',
          'Three things to keep an eye on through week 6: process adherence per journey trending up across reflections, the directional flag landing on "more on track" or "about the same" most weeks, and Mister P’s answers feeling more calibrated to your situation as your check-in history piles up. Outcomes — visible body composition shift, a sharper haircut feel, better sleep continuity — usually arrive between weeks 6 and 12.',
          'If it’s not paying off by week 6, walk away. We’d rather you leave than stay on something that isn’t earning its keep. Your data stays yours. If you come back later, your journeys and history will still be here.',
        ],
        ctaHref: `${appUrl}/today`,
        ctaLabel: CTA_OPEN,
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
