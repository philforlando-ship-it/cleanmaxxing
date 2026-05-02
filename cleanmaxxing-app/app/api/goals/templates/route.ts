import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { GOAL_TEMPLATES } from '@/content/goal-templates';
import { focusSlugsFor, scoreDoc } from '@/lib/onboarding/goal-suggest';
import { plainLanguageFor } from '@/lib/content/plain-language';
import type { AgeSegment } from '@/lib/onboarding/types';
import { computeFitBucket } from '@/lib/goals/fit-score';
import { detectRiskSignals } from '@/lib/self-acceptance/risk-signals';

// Returns every goal template joined with its POV doc metadata,
// filtered to the user's age segment, and sorted by personalized
// relevance score (focus-area match + tier + process bias). Flags any
// template that matches an existing active goal as already_active.

// Library-side age match. Mirrors the inheritance fallback used by the
// goal-ranker's appliesToAge in lib/onboarding/goal-suggest.ts: 41-45
// users see 33-40 docs, 46-55 users see 41-45 or 33-40 docs. Until the
// POV _metadata.json audit tags those segments explicitly, the library
// would otherwise empty out for any 41+ user. Differs from the ranker
// version in being permissive about null/empty age_segments — the
// library shows untagged docs to everyone, the ranker excludes them.
function matchesAge(docSegments: string[] | null, userSegment: AgeSegment | null): boolean {
  if (!userSegment) return true;
  if (!docSegments || docSegments.length === 0) return true;
  if (docSegments.includes(userSegment)) return true;
  if (userSegment === '41-45' && docSegments.includes('33-40')) return true;
  if (
    userSegment === '46-55' &&
    (docSegments.includes('41-45') || docSegments.includes('33-40'))
  ) {
    return true;
  }
  return false;
}
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
    .select('title, priority_tier')
    .eq('user_id', user.id)
    .eq('status', 'active');
  const activeRows = (activeGoals ?? []) as Array<{
    title: string;
    priority_tier: string | null;
  }>;
  const activeTitles = new Set(activeRows.map((g) => g.title));
  const activeTiers = activeRows.map((g) => g.priority_tier).filter((t): t is string => Boolean(t));

  // Self-acceptance gating: when any risk pattern fires (over-capacity,
  // polish-without-base, circuit breaker, abandon-restart), the fit
  // score promotes self-acceptance templates from situational →
  // recommended-now. The detector lives in lib/self-acceptance so
  // /today's nudge card reads from the same source.
  const riskSignals = await detectRiskSignals(supabase, user.id);
  const focusSlugSet = new Set(focusSlugs);

  const docsBySlug = new Map((povDocs ?? []).map((d) => [d.slug, d]));

  const templates = [];
  // Iterate templates, not POV docs — multiple templates can share a
  // source_slug (e.g. a process and an outcome both anchored to 19-strength-training).
  for (const t of Object.values(GOAL_TEMPLATES)) {
    const doc = docsBySlug.get(t.source_slug);
    if (!doc) continue;
    if (!matchesAge(doc.age_segments as string[] | null, ageSegment)) continue;

    const score = scoreDoc(doc.slug, doc.priority_tier, focusSlugs, t.goal_type);
    const fit_bucket = computeFitBucket(
      {
        tier: doc.priority_tier as string | null,
        domain: t.domain,
        source_slug: doc.slug,
      },
      {
        activeTiers,
        focusSlugs: focusSlugSet,
        selfAcceptanceTriggered: riskSignals.triggered,
      },
    );

    templates.push({
      source_slug: doc.slug,
      title: t.title,
      description: t.description,
      plain_language: plainLanguageFor(doc.slug),
      category: doc.category,
      priority_tier: doc.priority_tier,
      goal_type: t.goal_type,
      domain: t.domain,
      measurement_type: t.measurement_type,
      already_active: activeTitles.has(t.title),
      score,
      fit_bucket,
    });
  }

  // Sort by score desc, with alphabetical title as a stable tiebreaker.
  templates.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.title.localeCompare(b.title);
  });

  return NextResponse.json({ templates });
}
