// POST /api/plan/sleep/weekly-review/generate
// On-demand weekly sleep review generation. Pulls the past 7 days of
// sleep_logs + commitment adherence (and the prior 7 days for trend
// comparison), composes a 4-section markdown retrospective via Sonnet,
// and persists the row. Idempotent for the same week — the upsert
// reuses the existing row and overwrites the review_text.
//
// No request body. The window is "today minus 6 days through today"
// in the user's timezone.
//
// Errors:
//   401 unauthorized
//   500 generation_failed

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateAndSaveWeeklyReview } from '@/lib/sleep/weekly-review';
import { appDayFor } from '@/lib/date/app-day';

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  // Resolve the user's app-day in their local timezone — same
  // convention as the sleep_logs.night_of and commitment_logs.app_day.
  const { data: userRow } = await supabase
    .from('users')
    .select('timezone')
    .eq('id', user.id)
    .maybeSingle();
  const tz =
    (userRow as { timezone: string | null } | null)?.timezone ??
    'America/New_York';
  const todayAppDay = appDayFor(tz);

  try {
    const review = await generateAndSaveWeeklyReview(
      supabase,
      user.id,
      todayAppDay,
    );
    return NextResponse.json({
      ok: true,
      review: {
        id: review.id,
        week_start_app_day: review.week_start_app_day,
        week_end_app_day: review.week_end_app_day,
        review_text: review.review_text,
        generated_at: review.generated_at,
      },
    });
  } catch (err) {
    console.error('sleep_weekly_review_generation_failed', err);
    return NextResponse.json(
      { error: 'generation_failed', message: (err as Error).message },
      { status: 500 },
    );
  }
}
