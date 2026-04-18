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

// Active goal cap (spec §13). Users at or above this count trigger a
// soft override nudge on add. Client can retry with force: true to bypass.
const ACTIVE_GOAL_SOFT_CAP = 5;

type AddPayload = {
  title?: string;
  description?: string;
  category?: string;
  priority_tier?: string;
  goal_type?: 'process' | 'outcome';
  source_slug?: string;
  force?: boolean;
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

  const { title, description, category, priority_tier, goal_type, source_slug, force } = body;

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

  // Refuse duplicates. Prefer source_slug — it's the stable template
  // identifier (multiple templates can share a slug) and correctly handles
  // title rewrites without false positives on coincidental title matches.
  // Fall back to title match only for legacy adds that somehow don't carry
  // a slug (every current client supplies one).
  const dupQuery = supabase
    .from('goals')
    .select('id')
    .eq('user_id', user.id)
    .eq('status', 'active');
  const { data: existing } = source_slug
    ? await dupQuery.eq('source_slug', source_slug).maybeSingle()
    : await dupQuery.eq('title', title).maybeSingle();
  if (existing) {
    return NextResponse.json({ error: 'Already active.' }, { status: 409 });
  }

  // Soft goal cap check (spec §13). Count current active goals; if the user
  // is already at or above the cap and hasn't explicitly confirmed, return
  // the cap-reached flag so the client can show the nudge. The client retries
  // with force: true if the user chooses "Add anyway".
  if (!force) {
    const { count: activeCount } = await supabase
      .from('goals')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('status', 'active');

    if ((activeCount ?? 0) >= ACTIVE_GOAL_SOFT_CAP) {
      return NextResponse.json(
        {
          error: 'goal_limit_reached',
          active_count: activeCount ?? 0,
          cap: ACTIVE_GOAL_SOFT_CAP,
        },
        { status: 409 }
      );
    }
  }

  const { error: insErr } = await supabase.from('goals').insert({
    user_id: user.id,
    title,
    description: description ?? null,
    category: category ?? null,
    priority_tier,
    goal_type,
    source_slug: source_slug ?? null,
    status: 'active',
    source: 'system_suggested',
  });
  if (insErr) {
    return NextResponse.json({ error: insErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
