import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { GOAL_TEMPLATES } from '@/content/goal-templates';
import { focusSlugsFor, scoreDoc } from '@/lib/onboarding/goal-suggest';
import type { AgeSegment } from '@/lib/onboarding/types';

// Returns every goal template joined with its POV doc metadata,
// filtered to the user's age segment, and sorted by personalized
// relevance score (focus-area match + tier + process bias). Flags any
// template that matches an existing active goal as already_active.
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('users')
    .select('age_segment')
    .eq('id', user.id)
    .maybeSingle();

  const ageSegment = (profile?.age_segment ?? null) as AgeSegment | null;

  // Pull focus areas from the survey so library ordering matches onboarding.
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
  const focusSlugs = focusSlugsFor(focusAreas);

  const { data: povDocs, error: povErr } = await supabase
    .from('pov_docs')
    .select('slug, title, category, priority_tier, age_segments');
  if (povErr) {
    return NextResponse.json({ error: povErr.message }, { status: 500 });
  }

  const { data: activeGoals } = await supabase
    .from('goals')
    .select('title')
    .eq('user_id', user.id)
    .eq('status', 'active');
  const activeTitles = new Set((activeGoals ?? []).map((g) => g.title));

  const templates = [];
  for (const doc of povDocs ?? []) {
    if (!(doc.slug in GOAL_TEMPLATES)) continue;
    if (ageSegment && doc.age_segments && !doc.age_segments.includes(ageSegment)) continue;

    const t = GOAL_TEMPLATES[doc.slug];
    const score = scoreDoc(doc.slug, doc.priority_tier, focusSlugs, t.goal_type);

    templates.push({
      source_slug: doc.slug,
      title: t.title,
      description: t.description,
      category: doc.category,
      priority_tier: doc.priority_tier,
      goal_type: t.goal_type,
      already_active: activeTitles.has(t.title),
      score,
    });
  }

  // Sort by score desc, with alphabetical title as a stable tiebreaker.
  templates.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.title.localeCompare(b.title);
  });

  return NextResponse.json({ templates });
}
