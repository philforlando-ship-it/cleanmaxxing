import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { rankCandidates, pickTopN, type PovDocRow } from '@/lib/onboarding/goal-suggest';
import type { AgeSegment } from '@/lib/onboarding/types';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  // Profile (age_segment) is required for suggestions.
  const { data: profile } = await supabase
    .from('users')
    .select('age_segment')
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
  });

  const top = pickTopN(ranked, 3);
  // Return 7 alternatives for the swap cycle — top of the remaining list.
  const alternatives = ranked.filter((g) => !top.includes(g)).slice(0, 7);

  return NextResponse.json({
    suggested: top,
    alternatives,
  });
}
