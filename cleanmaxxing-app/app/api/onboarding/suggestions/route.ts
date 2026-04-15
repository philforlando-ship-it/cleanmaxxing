import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  rankCandidates,
  pickTopN,
  type PovDocRow,
  type MotivationSegment,
} from '@/lib/onboarding/goal-suggest';
import type { AgeSegment } from '@/lib/onboarding/types';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  // Profile (age_segment) is required for suggestions. motivation_segment
  // is optional — present only if the 0005 migration has been applied and
  // the user answered Q4.
  const { data: profile } = await supabase
    .from('users')
    .select('age_segment, motivation_segment')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile?.age_segment) {
    return NextResponse.json(
      { error: 'Survey not yet submitted.' },
      { status: 400 }
    );
  }

  // Focus areas from survey_responses (question key: focus_areas, JSON string array).
  const { data: focusRow } = await supabase
    .from('survey_responses')
    .select('response_value')
    .eq('user_id', user.id)
    .eq('question_key', 'focus_areas')
    .maybeSingle();

  let focusAreas: string[] = [];
  if (focusRow?.response_value) {
    try {
      const parsed = JSON.parse(focusRow.response_value);
      if (Array.isArray(parsed)) focusAreas = parsed;
    } catch {
      // ignore — treat as no focus areas
    }
  }

  const { data: povRows, error: povErr } = await supabase
    .from('pov_docs')
    .select('slug, title, category, priority_tier, age_segments');
  if (povErr) {
    return NextResponse.json({ error: povErr.message }, { status: 500 });
  }

  const ranked = rankCandidates({
    povDocs: (povRows ?? []) as PovDocRow[],
    ageSegment: profile.age_segment as AgeSegment,
    focusAreas,
    motivationSegment: (profile.motivation_segment ?? null) as MotivationSegment,
  });

  const top = pickTopN(ranked, 3);

  // Build the swap queue with outcome goals at the front. The top 3 are
  // always process goals by design (process bonus + category diversity),
  // so without this ordering the swap button would only ever surface more
  // process goals — users would never reach an outcome via swap, and the
  // §13 nudge (which fires when fewer than 2 of 3 are process) could never
  // be triggered by swap alone.
  const remaining = ranked.filter((g) => !top.includes(g));
  const outcomeAlts = remaining.filter((g) => g.goal_type === 'outcome');
  const processAlts = remaining.filter((g) => g.goal_type === 'process');
  const alternatives = [...outcomeAlts, ...processAlts].slice(0, 15);

  return NextResponse.json({
    suggested: top,
    alternatives,
  });
}
