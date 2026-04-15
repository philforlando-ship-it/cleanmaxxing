/**
 * Weekly reflection email composer (spec §2.5 stickiness 5a).
 *
 * Sunday 6pm email with: days checked in out of 7, goal completion rate,
 * one pattern observation from day-of-week clustering, and one small
 * suggestion for the coming week. Tone: conversation, not judgment.
 *
 * Called from app/api/cron/weekly-email/route.ts on a weekly Vercel cron.
 * The template returns both an HTML body and a plain-text body so Resend
 * can deliver cleanly on clients that strip HTML.
 */
import type { SupabaseClient } from '@supabase/supabase-js';

export type WeeklyEmailData = {
  days_checked_in: number; // 0–7
  goal_completion_rate: number | null; // 0–1, null if no check-ins
  total_goal_entries: number;
  completed_goal_entries: number;
  pattern_observation: string | null;
  suggestion: string;
};

/**
 * Compose weekly data for a single user. Reads the last 7 days of
 * check_ins + goal_check_ins, runs a light day-of-week clustering pass,
 * and picks one suggestion.
 */
export async function computeWeeklyEmailData(
  supabase: SupabaseClient,
  userId: string,
  now: Date = new Date()
): Promise<WeeklyEmailData> {
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const sinceDate = sevenDaysAgo.toISOString().slice(0, 10);

  const { data: checkIns } = await supabase
    .from('check_ins')
    .select('id, date')
    .eq('user_id', userId)
    .gte('date', sinceDate)
    .order('date', { ascending: true });

  const checkInRows = checkIns ?? [];
  const daysCheckedIn = checkInRows.length;

  // Pull goal_check_ins for those check_ins in one batch.
  const checkInIds = checkInRows.map((r) => r.id as string);
  let totalEntries = 0;
  let completedEntries = 0;
  if (checkInIds.length > 0) {
    const { data: goalChecks } = await supabase
      .from('goal_check_ins')
      .select('completed, check_in_id')
      .in('check_in_id', checkInIds);
    const rows = goalChecks ?? [];
    totalEntries = rows.length;
    completedEntries = rows.filter((r) => r.completed === true).length;
  }

  const completionRate = totalEntries > 0 ? completedEntries / totalEntries : null;

  // Day-of-week pattern: bucket check-ins Mon–Sun, look for early-week
  // spike with late-week drop (the classic "crush it then fade" pattern).
  // Only emit a line if the pattern is actually pronounced — otherwise
  // skip so the email doesn't invent noise.
  const dowCounts = new Array<number>(7).fill(0); // 0 = Mon ... 6 = Sun
  for (const row of checkInRows) {
    const d = new Date(row.date as string);
    const jsDay = d.getDay(); // 0 = Sun
    const mondayIndex = (jsDay + 6) % 7;
    dowCounts[mondayIndex] += 1;
  }

  let patternObservation: string | null = null;
  if (daysCheckedIn >= 4) {
    const earlyWeek = dowCounts[0] + dowCounts[1] + dowCounts[2];
    const lateWeek = dowCounts[3] + dowCounts[4];
    const weekend = dowCounts[5] + dowCounts[6];
    if (earlyWeek >= 3 && lateWeek === 0) {
      patternObservation =
        'You crush it Mon–Wed, then drop off Thu–Fri. That gap is where most habits die — what if you did your check-in right after breakfast on Thursday instead of at night?';
    } else if (earlyWeek + lateWeek >= 4 && weekend === 0) {
      patternObservation =
        'You show up on weekdays but weekends are where it falls off. That\'s common — not a failure, just a pattern worth noticing.';
    } else if (weekend >= 2 && earlyWeek === 0) {
      patternObservation =
        'Your consistency this week was on the weekend, not the weekdays. If that keeps up, think about what\'s different about Saturday morning that makes it easier.';
    }
  }

  const suggestion =
    pickSuggestion(daysCheckedIn, completionRate) ??
    'One small thing for this week: pick the one goal that felt hardest and do it first tomorrow.';

  return {
    days_checked_in: daysCheckedIn,
    goal_completion_rate: completionRate,
    total_goal_entries: totalEntries,
    completed_goal_entries: completedEntries,
    pattern_observation: patternObservation,
    suggestion,
  };
}

function pickSuggestion(
  daysCheckedIn: number,
  completionRate: number | null
): string | null {
  if (daysCheckedIn === 0) {
    return 'You didn\'t check in this week. No guilt — just open the app tomorrow and do one check-in. That\'s the whole move.';
  }
  if (daysCheckedIn <= 2) {
    return 'Try stacking the check-in onto something you already do — right after coffee, right before bed. Willpower runs out; habit stacking doesn\'t.';
  }
  if (completionRate !== null && completionRate < 0.5) {
    return 'You\'re showing up but missing on the goals themselves. That usually means one of them is too ambitious for where you are right now. Consider swapping it for something smaller.';
  }
  if (completionRate !== null && completionRate >= 0.8) {
    return 'Strong week. If it keeps feeling easy, you\'re ready to layer one more goal in. If it stops feeling easy, that\'s fine too — consistency beats intensity.';
  }
  return null;
}

/**
 * Render the email. Subject is short; body references the data in a
 * conversational tone per spec example ("You checked in 5 out of 7...").
 */
export function renderWeeklyEmail(
  data: WeeklyEmailData,
  appUrl: string
): { subject: string; html: string; text: string } {
  const pctLine =
    data.goal_completion_rate !== null
      ? `completed your goals ${data.completed_goal_entries} out of ${data.total_goal_entries} times`
      : 'no goal check-ins logged';

  const subject =
    data.days_checked_in === 0
      ? 'A quiet week — open the app tomorrow'
      : `${data.days_checked_in}/7 days this week`;

  const paragraphs = [
    `You checked in ${data.days_checked_in} out of 7 days this week and ${pctLine}.`,
  ];
  if (data.pattern_observation) paragraphs.push(data.pattern_observation);
  paragraphs.push(data.suggestion);

  const text = [
    ...paragraphs,
    '',
    `Open Cleanmaxxing: ${appUrl}/today`,
    '',
    '— Mister P',
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
      <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: #71717a; margin-bottom: 8px;">Weekly reflection</div>
      ${htmlParagraphs}
      <a href="${appUrl}/today" style="display: inline-block; margin-top: 8px; padding: 10px 16px; background: #18181b; color: #ffffff; text-decoration: none; border-radius: 8px; font-size: 14px; font-weight: 500;">Open Cleanmaxxing</a>
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
