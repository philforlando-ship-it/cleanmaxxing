/**
 * Weekly letter composer.
 *
 * Pulls the user's last-week state (sleep, workouts, check-ins,
 * reflection notes, recent Mister P questions) and asks Claude
 * to write a short letter from Mister P. Tone constraints
 * intentionally tight — the surface dies the moment it starts
 * sounding like a stat sheet or a coach's pep talk.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { generateText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { getMisterPUserState, type MisterPUserState } from '@/lib/mister-p/user-state';

type LetterContext = {
  state: MisterPUserState;
  reflectionNotes: string | null;
  reflectionDimsAvg: number | null;
  recentQuestions: string[];
  daysCheckedInLast7: number;
  dailyResponses: Array<{ question: string; response: string }>;
};

export async function gatherLetterContext(
  supabase: SupabaseClient,
  userId: string,
  now: Date = new Date(),
): Promise<LetterContext> {
  const state = await getMisterPUserState(supabase, userId, now);

  const { data: reflRows } = await supabase
    .from('weekly_reflections')
    .select(
      'notes, social_confidence, work_confidence, physical_confidence, appearance_confidence',
    )
    .eq('user_id', userId)
    .order('week_start', { ascending: false })
    .limit(1);
  const refl = reflRows?.[0] as
    | {
        notes: string | null;
        social_confidence: number;
        work_confidence: number;
        physical_confidence: number;
        appearance_confidence: number;
      }
    | undefined;
  const reflectionNotes = refl?.notes?.trim() || null;
  const reflectionDimsAvg = refl
    ? (refl.social_confidence +
        refl.work_confidence +
        refl.physical_confidence +
        refl.appearance_confidence) /
      4
    : null;

  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const sinceIso = sevenDaysAgo.toISOString().slice(0, 10);

  const { data: checkIns } = await supabase
    .from('check_ins')
    .select('id')
    .eq('user_id', userId)
    .gte('date', sinceIso);
  const daysCheckedInLast7 = (checkIns ?? []).length;

  const { data: queryRows } = await supabase
    .from('mister_p_queries')
    .select('question')
    .eq('user_id', userId)
    .gte('created_at', sevenDaysAgo.toISOString())
    .order('created_at', { ascending: false })
    .limit(8);
  const recentQuestions = ((queryRows ?? []) as Array<{ question: string }>)
    .map((r) => r.question?.trim())
    .filter((q): q is string => Boolean(q))
    .slice(0, 5);

  const { data: dailyRows } = await supabase
    .from('daily_notes')
    .select('question, response')
    .eq('user_id', userId)
    .not('response', 'is', null)
    .gte('day', sinceIso)
    .order('responded_at', { ascending: false })
    .limit(4);
  const dailyResponses = ((dailyRows ?? []) as Array<{
    question: string;
    response: string | null;
  }>)
    .filter((r): r is { question: string; response: string } => Boolean(r.response))
    .map((r) => ({ question: r.question, response: r.response }));

  return {
    state,
    reflectionNotes,
    reflectionDimsAvg,
    recentQuestions,
    daysCheckedInLast7,
    dailyResponses,
  };
}

function formatContextBlock(ctx: LetterContext): string {
  const { state } = ctx;
  const lines: string[] = [];

  lines.push(`tenure: ${state.daysSinceOnboarding} days since onboarding`);
  if (state.specificThing) {
    lines.push(`specific_thing: ${state.specificThing}`);
  }

  lines.push(`days_checked_in_last_7: ${ctx.daysCheckedInLast7}`);
  if (state.weeklyCompletionRate !== null) {
    lines.push(
      `weekly_goal_completion: ${Math.round(state.weeklyCompletionRate * 100)}%`,
    );
  }

  if (state.workoutCountLast7 > 0) {
    const types = Object.entries(state.workoutTypesLast7)
      .sort(([, a], [, b]) => (b as number) - (a as number))
      .map(([t, n]) => `${n} ${t}`)
      .join(', ');
    lines.push(`workouts_last_7d: ${state.workoutCountLast7} (${types})`);
  } else {
    lines.push(`workouts_last_7d: 0 logged`);
  }

  if (state.sleepRecentCount > 0 && state.sleepRecentAvgHours !== null) {
    lines.push(
      `sleep_avg_last_7d: ${state.sleepRecentAvgHours.toFixed(1)}h over ${state.sleepRecentCount} logged nights${
        state.sleepRecentAvgQuality !== null
          ? ` (quality ${state.sleepRecentAvgQuality.toFixed(1)}/5)`
          : ''
      }`,
    );
  }

  if (state.confidence) {
    const c = state.confidence;
    const fmt = (n: { value: number; trend: string | null }) =>
      `${n.value}${n.trend ? ` ${n.trend}` : ''}`;
    lines.push(
      `confidence_latest: social ${fmt(c.social)}, work ${fmt(c.work)}, physical ${fmt(c.physical)}, appearance ${fmt(c.appearance)}`,
    );
  }
  if (state.stuckDimensions.length > 0) {
    lines.push(`stuck_dimensions: ${state.stuckDimensions.join(', ')}`);
  }
  if (ctx.reflectionDimsAvg !== null) {
    lines.push(`reflection_avg: ${ctx.reflectionDimsAvg.toFixed(1)}/5`);
  }
  if (ctx.reflectionNotes) {
    lines.push(`reflection_notes: ${ctx.reflectionNotes}`);
  }

  if (ctx.recentQuestions.length > 0) {
    lines.push('recent_questions_to_mister_p:');
    for (const q of ctx.recentQuestions) {
      lines.push(`  - ${q.length > 200 ? q.slice(0, 200) + '…' : q}`);
    }
  }
  if (ctx.dailyResponses.length > 0) {
    lines.push('recent_daily_responses:');
    for (const r of ctx.dailyResponses) {
      const resp = r.response.length > 200 ? r.response.slice(0, 200) + '…' : r.response;
      lines.push(`  Q: ${r.question}`);
      lines.push(`  A: ${resp}`);
    }
  }

  if (state.firstConvoBlockers) {
    lines.push(`onboarding_blockers: ${state.firstConvoBlockers}`);
  }

  return lines.join('\n');
}

const LETTER_SYSTEM_PROMPT = `You are Mister P, the voice of Cleanmaxxing. You are writing a short Sunday letter to one user, summarizing what you noticed about their week.

This is NOT a chat response. It is a one-way letter the user will read on their /today page. They cannot reply to it (they can chat with you separately). Length: 150–250 words. Plain prose, no lists, no headers, no markdown.

Your voice:
- Direct and a little dry. Never hedges, never lectures, never moralizes.
- Never uses the word "journey." Never starts with "Hey" or "Great work this week" or any sycophantic opener.
- Refer to yourself as "I" and the user as "you."
- Willing to call out a pattern that isn't working, or to tell the user something doesn't matter.

What the letter should do:
1. Open with one specific, concrete thing you noticed from the data — sleep, workouts, what they wrote in the daily notes, the questions they asked you, whatever stands out. Not generic ("you had a productive week"). One sentence.
2. Build on it. What does it suggest? What is the one thing worth focusing on next week? Be specific.
3. Optional: name a pattern that might trip them up if it continues.
4. Close with a short, grounded line. Not a pep talk. Not a CTA. Maybe a question they can sit with, maybe nothing.

Things to avoid:
- Listing stats back at the user ("you checked in 5 of 7 days, your sleep averaged 7.2 hours…"). They have those numbers; you don't need to recite them.
- Praise inflation. If the week was middling, say so. If they barely showed up, name it without scolding.
- Vague encouragement. "Keep going!" "You've got this!" — never.
- Pretending you know things you don't. If the data is thin (new user, low logging), say less rather than inventing.
- Mentioning Cleanmaxxing, the app, or the surfaces by name. You're writing to them, not narrating the product.

If the user is genuinely new (under 4 days, almost no data), keep it under 100 words: welcome them, name one thing you'd like them to do this week, stop. Do not fabricate observations from no signal.`;

export async function composeWeeklyLetter(
  supabase: SupabaseClient,
  userId: string,
  now: Date = new Date(),
): Promise<string> {
  const ctx = await gatherLetterContext(supabase, userId, now);
  const contextBlock = formatContextBlock(ctx);

  const prompt = `Here is what I have on the user this week:

--- USER STATE ---
${contextBlock}
--- END USER STATE ---

Write the letter now. 150–250 words, plain prose, no lists, no headers.`;

  const { text } = await generateText({
    model: anthropic('claude-sonnet-4-6'),
    system: LETTER_SYSTEM_PROMPT,
    prompt,
    temperature: 0.6,
  });

  return text.trim();
}
