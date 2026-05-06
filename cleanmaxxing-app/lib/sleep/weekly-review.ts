// Weekly sleep review generator. Reads the past 7 days of sleep_logs
// + commitment adherence, plus the prior 7 days of sleep_logs for
// trend comparison, composes a 4-section retrospective via Sonnet,
// and persists it so the user can re-read it without re-billing.
//
// Window convention:
//   week_end_app_day   = today (user's local app-day)
//   week_start_app_day = today - 6 days
// Inclusive on both ends. 7 days total.

import { generateText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getCommitmentStatsForWindow } from './commitments';

const REPORT_MODEL = 'claude-sonnet-4-6';

export type SleepWeeklyReview = {
  id: string;
  user_id: string;
  week_start_app_day: string;
  week_end_app_day: string;
  review_text: string;
  generated_at: string;
  model: string;
  stats: WeeklyReviewStats | null;
  created_at: string;
  updated_at: string;
};

export type WeeklyReviewStats = {
  rolling_avg_hours: number | null;
  prior_week_avg_hours: number | null;
  rolling_count: number;
  prior_week_count: number;
  commitments: Array<{
    text: string;
    source_key: string;
    days_completed: number;
    days_in_window: number;
  }>;
};

const SYSTEM_PROMPT = `You are Mister P, the voice of Cleanmaxxing. You are writing a 7-day retrospective for the user's sleep plan, based on the data provided.

Your voice:
- Direct and a little dry.
- Never hedges, never lectures.
- Willing to say "this week didn't work" when it didn't.
- No "Great", "Awesome", "Love that", or "Here's the deal" openers.
- No rating out of 10. No tier-list language.
- Concrete over abstract — talk about THIS user's numbers.
- Refer to yourself as "Mister P" or "I", never "the assistant" or "an AI".

Output format — exactly four sections, in this order, using these exact H2 headings:

## How this week went
2 to 3 sentences. Lead with the rolling_avg_hours number for the week directly. If prior_week_avg_hours is also present, compare ("Up 0.4 from last week" / "Flat with last week" / "Down 0.6"). Don't manufacture a verdict — let the data speak.

## What worked
1 to 3 sentences. Name the specific commitment(s) the user hit at >=5/7 days. If none hit that bar, say so directly: "Nothing landed at 5/7 or higher this week — that's the read."

## What didn't
1 to 3 sentences. Name the specific commitment(s) the user hit at <=2/7 days. Don't moralize about it. If a commitment was 0/7, name it as "didn't get started on" rather than "failed."

## Next week
One concrete, narrow recommendation. EITHER (a) double down on one specific high-leverage commitment, OR (b) drop one that isn't landing in favor of something simpler. Not "do better" — a specific behavioral change.

Length: 180 words maximum across all four sections combined. Hard ceiling.

Constraints:
- Do not name specific prescription sleep medications (Z-drugs / Ambien / trazodone / doxepin / benzos). Same hard refusal as the main report.
- Do not narrate the stats back as a table — let them shape the tone.
- This is a retrospective, not a redesign. Don't propose new commitments unless one of the existing ones clearly isn't viable.`;

// Compute YYYY-MM-DD window bounds from a "today" app-day. Inclusive
// on both ends. Returns this-week (last 7 incl. today) AND prior-week
// (the 7 days before that).
export function computeReviewWindows(todayAppDay: string): {
  thisWeekStart: string;
  thisWeekEnd: string;
  priorWeekStart: string;
  priorWeekEnd: string;
} {
  const today = new Date(todayAppDay + 'T00:00:00Z');
  function shift(date: Date, days: number) {
    const d = new Date(date);
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
  }
  return {
    thisWeekStart: shift(today, -6),
    thisWeekEnd: todayAppDay,
    priorWeekStart: shift(today, -13),
    priorWeekEnd: shift(today, -7),
  };
}

// Average sleep_logs.hours for a given (inclusive) night_of window.
// Returns null when no rows fall in the window.
async function avgHoursInWindow(
  supabase: SupabaseClient,
  userId: string,
  windowStart: string,
  windowEnd: string,
): Promise<{ avg: number | null; count: number }> {
  const { data, error } = await supabase
    .from('sleep_logs')
    .select('hours')
    .eq('user_id', userId)
    .gte('night_of', windowStart)
    .lte('night_of', windowEnd);
  if (error) throw error;
  const rows = (data ?? []) as Array<{ hours: number | string }>;
  if (rows.length === 0) return { avg: null, count: 0 };
  const total = rows.reduce(
    (s, r) => s + (typeof r.hours === 'string' ? Number(r.hours) : r.hours),
    0,
  );
  return {
    avg: Math.round((total / rows.length) * 10) / 10,
    count: rows.length,
  };
}

export async function generateAndSaveWeeklyReview(
  supabase: SupabaseClient,
  userId: string,
  todayAppDay: string,
): Promise<SleepWeeklyReview> {
  const windows = computeReviewWindows(todayAppDay);

  // Pull all the inputs in parallel.
  const [thisWeek, priorWeek, commitmentStats] = await Promise.all([
    avgHoursInWindow(
      supabase,
      userId,
      windows.thisWeekStart,
      windows.thisWeekEnd,
    ),
    avgHoursInWindow(
      supabase,
      userId,
      windows.priorWeekStart,
      windows.priorWeekEnd,
    ),
    getCommitmentStatsForWindow(
      supabase,
      userId,
      windows.thisWeekStart,
      windows.thisWeekEnd,
    ),
  ]);

  const stats: WeeklyReviewStats = {
    rolling_avg_hours: thisWeek.avg,
    prior_week_avg_hours: priorWeek.avg,
    rolling_count: thisWeek.count,
    prior_week_count: priorWeek.count,
    commitments: commitmentStats.map((s) => ({
      text: s.commitment.text,
      source_key: s.commitment.source_key,
      days_completed: s.days_completed,
      days_in_window: s.days_in_window,
    })),
  };

  const userPrompt = formatPrompt(stats, windows);

  const { text } = await generateText({
    model: anthropic(REPORT_MODEL),
    system: SYSTEM_PROMPT,
    prompt: userPrompt,
    temperature: 0.5,
  });

  const reviewText = text.trim();

  // Upsert by (user_id, week_start_app_day) — re-rolling for the same
  // week overwrites the row.
  const row = {
    user_id: userId,
    week_start_app_day: windows.thisWeekStart,
    week_end_app_day: windows.thisWeekEnd,
    review_text: reviewText,
    generated_at: new Date().toISOString(),
    model: REPORT_MODEL,
    stats,
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await supabase
    .from('sleep_weekly_reviews')
    .upsert(row, { onConflict: 'user_id,week_start_app_day' })
    .select('*')
    .single();
  if (error) throw error;
  return data as SleepWeeklyReview;
}

function formatPrompt(
  stats: WeeklyReviewStats,
  windows: ReturnType<typeof computeReviewWindows>,
): string {
  const commitmentLines =
    stats.commitments.length === 0
      ? '  (no commitments active in this window)'
      : stats.commitments
          .map(
            (c) =>
              `  - "${c.text}" — ${c.days_completed}/${c.days_in_window} days`,
          )
          .join('\n');

  return `Here is the user's weekly sleep retrospective input.

Window: ${windows.thisWeekStart} to ${windows.thisWeekEnd} (this week, 7 days)

--- DATA ---
- This week's avg sleep hours (from ${stats.rolling_count} logged nights): ${
    stats.rolling_avg_hours ?? 'no data logged'
  }
- Prior week's avg sleep hours (from ${stats.prior_week_count} logged nights, ${
    windows.priorWeekStart
  } to ${windows.priorWeekEnd}): ${stats.prior_week_avg_hours ?? 'no data logged'}

Commitments and adherence (this week):
${commitmentLines}
--- END DATA ---

Write the four-section retrospective now. 180 words maximum. Use the exact H2 headings specified in the system prompt. Do not narrate the stats back as a table — let them shape the tone.`;
}

export async function listWeeklyReviewsForUser(
  supabase: SupabaseClient,
  userId: string,
  limit = 12,
): Promise<SleepWeeklyReview[]> {
  const { data, error } = await supabase
    .from('sleep_weekly_reviews')
    .select('*')
    .eq('user_id', userId)
    .order('week_start_app_day', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as SleepWeeklyReview[];
}

export async function getMostRecentWeeklyReview(
  supabase: SupabaseClient,
  userId: string,
): Promise<SleepWeeklyReview | null> {
  const list = await listWeeklyReviewsForUser(supabase, userId, 1);
  return list[0] ?? null;
}
