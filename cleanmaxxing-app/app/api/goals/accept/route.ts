import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

type IncomingGoal = {
  title: string;
  description: string;
  category: string;
  priority_tier: string;
  goal_type: 'process' | 'outcome';
  source_slug?: string;
  baseline_stage?: string;
};

const ALLOWED_TIERS = new Set([
  'tier-1',
  'tier-2',
  'tier-3',
  'tier-4',
  'tier-5',
  'conditional-tier-1',
  'advanced',
]);

const ALLOWED_BASELINE_STAGES = new Set(['new', 'light', 'partial', 'established']);

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  let body: { goals?: IncomingGoal[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const goals = body.goals ?? [];
  if (!Array.isArray(goals) || goals.length === 0) {
    return NextResponse.json({ error: 'Must accept at least one goal.' }, { status: 400 });
  }
  if (goals.length > 10) {
    return NextResponse.json({ error: 'Too many goals.' }, { status: 400 });
  }

  // Validate each goal shape
  for (const g of goals) {
    if (!g.title || typeof g.title !== 'string') {
      return NextResponse.json({ error: 'Goal missing title.' }, { status: 400 });
    }
    if (!ALLOWED_TIERS.has(g.priority_tier)) {
      return NextResponse.json({ error: `Invalid tier: ${g.priority_tier}` }, { status: 400 });
    }
    if (g.goal_type !== 'process' && g.goal_type !== 'outcome') {
      return NextResponse.json({ error: 'Invalid goal_type.' }, { status: 400 });
    }
    if (g.baseline_stage !== undefined && !ALLOWED_BASELINE_STAGES.has(g.baseline_stage)) {
      return NextResponse.json({ error: `Invalid baseline_stage: ${g.baseline_stage}` }, { status: 400 });
    }
  }

  // Confirm the user has actually submitted the survey.
  const { data: profile } = await supabase
    .from('users')
    .select('age_segment')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile?.age_segment) {
    return NextResponse.json({ error: 'Survey not yet submitted.' }, { status: 400 });
  }

  const rows = goals.map((g) => ({
    user_id: user.id,
    title: g.title,
    description: g.description,
    category: g.category,
    priority_tier: g.priority_tier,
    goal_type: g.goal_type,
    source_slug: g.source_slug ?? null,
    baseline_stage: g.baseline_stage ?? 'new',
    status: 'active',
    source: 'system_suggested',
  }));

  const { error: insErr } = await supabase.from('goals').insert(rows);
  if (insErr) {
    return NextResponse.json({ error: insErr.message }, { status: 500 });
  }

  // Mark onboarding complete now that goals are chosen.
  const { error: userErr } = await supabase
    .from('users')
    .update({ onboarding_completed_at: new Date().toISOString() })
    .eq('id', user.id);
  if (userErr) {
    return NextResponse.json({ error: userErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, count: rows.length });
}
