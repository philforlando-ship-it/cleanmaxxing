import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const ALLOWED_TIERS = new Set([
  'tier-1',
  'tier-2',
  'tier-3',
  'tier-4',
  'tier-5',
  'conditional-tier-1',
  'advanced',
]);

type AddPayload = {
  title?: string;
  description?: string;
  category?: string;
  priority_tier?: string;
  goal_type?: 'process' | 'outcome';
};

// Adds a single goal to an already-onboarded user. Post-onboarding only —
// new users should go through /api/goals/accept which also marks onboarding
// complete.
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  let body: AddPayload;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { title, description, category, priority_tier, goal_type } = body;

  if (!title || typeof title !== 'string') {
    return NextResponse.json({ error: 'Missing title' }, { status: 400 });
  }
  if (!priority_tier || !ALLOWED_TIERS.has(priority_tier)) {
    return NextResponse.json({ error: 'Invalid tier' }, { status: 400 });
  }
  if (goal_type !== 'process' && goal_type !== 'outcome') {
    return NextResponse.json({ error: 'Invalid goal_type' }, { status: 400 });
  }

  const { data: profile } = await supabase
    .from('users')
    .select('onboarding_completed_at')
    .eq('id', user.id)
    .maybeSingle();
  if (!profile?.onboarding_completed_at) {
    return NextResponse.json(
      { error: 'Finish onboarding first.' },
      { status: 400 }
    );
  }

  // Refuse duplicates by title (crude but works — source_slug would be better,
  // schema doesn't carry it yet).
  const { data: existing } = await supabase
    .from('goals')
    .select('id')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .eq('title', title)
    .maybeSingle();
  if (existing) {
    return NextResponse.json({ error: 'Already active.' }, { status: 409 });
  }

  const { error: insErr } = await supabase.from('goals').insert({
    user_id: user.id,
    title,
    description: description ?? null,
    category: category ?? null,
    priority_tier,
    goal_type,
    status: 'active',
    source: 'system_suggested',
  });
  if (insErr) {
    return NextResponse.json({ error: insErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
