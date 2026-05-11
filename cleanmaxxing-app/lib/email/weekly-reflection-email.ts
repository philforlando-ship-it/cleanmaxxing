/**
 * Weekly reflection email composer.
 *
 * Sunday 6pm reminder email pointing users back to /reflection for
 * the week's wrap-up.
 *
 * Pre-Tier-3 (2026-05-10) this surface read days_checked_in / goal
 * completion rate / day-of-week pattern from check_ins +
 * goal_check_ins. The goals system retired alongside those tables;
 * the email is now a simple weekly nudge. A richer signal source
 * (weekly_reflections rows, journey-state progress) can be wired
 * back later if the engagement value justifies it.
 *
 * Called from app/api/cron/weekly-email/route.ts on a weekly Vercel
 * cron. Template returns both an HTML body and a plain-text body so
 * Resend can deliver cleanly on clients that strip HTML.
 */

export type WeeklyEmailData = {
  // Kept as an opaque struct in case the cron consumer expects a
  // shape — currently no per-user data is read into the email.
  // Retained for future re-enrichment.
  _placeholder: true;
};

export async function computeWeeklyEmailData(): Promise<WeeklyEmailData> {
  return { _placeholder: true };
}

/**
 * Render the email. Static weekly nudge; no per-user data interpolation.
 */
export function renderWeeklyEmail(
  _data: WeeklyEmailData,
  appUrl: string,
): { subject: string; html: string; text: string } {
  const subject = 'Sunday — two minutes on /reflection';

  const paragraphs = [
    "It's Sunday. Two minutes on /reflection is the highest-leverage habit the system has — process adherence per active journey, plus a few outcome questions on what actually changed.",
    "Sometimes the answer is the plan needs to change. Sometimes it's that life had other priorities. Worth naming which one it was this week.",
  ];

  const text = [
    ...paragraphs,
    '',
    `Open Cleanmaxxing: ${appUrl}/reflection`,
    '',
    '— Mister P',
  ].join('\n\n');

  const htmlParagraphs = paragraphs
    .map(
      (p) =>
        `<p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.6; color: #18181b;">${escapeHtml(
          p,
        )}</p>`,
    )
    .join('');

  const html = `<!doctype html>
<html>
  <body style="margin: 0; padding: 24px; background: #fafafa; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
    <div style="max-width: 560px; margin: 0 auto; background: #ffffff; padding: 32px; border-radius: 12px; border: 1px solid #e4e4e7;">
      <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: #71717a; margin-bottom: 8px;">Weekly reflection</div>
      ${htmlParagraphs}
      <a href="${appUrl}/reflection" style="display: inline-block; margin-top: 8px; padding: 10px 16px; background: #18181b; color: #ffffff; text-decoration: none; border-radius: 8px; font-size: 14px; font-weight: 500;">Open Cleanmaxxing</a>
      <div style="margin-top: 32px; font-size: 12px; color: #a1a1aa;">— Mister P</div>
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
