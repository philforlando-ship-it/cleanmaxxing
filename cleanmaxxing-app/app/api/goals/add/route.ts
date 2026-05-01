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

const ALLOWED_BASELINE_STAGES = new Set(['new', 'light', 'partial', 'established']);

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
  baseline_stage?: string;
  force?: boolean;
  // 'user_created' for custom-goal flow, 'system_suggested' for
  // templated library accepts. Defaults to system_suggested so
  // the templated path doesn't need to thread an extra field.
  source?: 'user_created' | 'system_suggested';
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

  const {
    title,
    description,
    category,
    priority_tier,
    goal_type,
    source_slug,
    baseline_stage,
    force,
    source,
  } = body;
  const goalSource: 'user_created' | 'system_suggested' =
    source === 'user_created' ? 'user_created' : 'system_suggested';

  if (!title || typeof title !== 'string') {
    return NextResponse.json({ error: 'Missing title' }, { status: 400 });
  }
  if (goal_type !== 'process' && goal_type !== 'outcome') {
    return NextResponse.json({ error: 'Invalid goal_type' }, { status: 400 });
  }
  const stage = baseline_stage ?? 'new';
  if (!ALLOWED_BASELINE_STAGES.has(stage)) {
    return NextResponse.json({ error: 'Invalid baseline_stage' }, { status: 400 });
  }

  // Resolve priority_tier + category from pov_docs when source_slug
  // is supplied. This is the canonical path — every goal in the
  // library is anchored to a POV, and custom goals are required to
  // pick a closest-POV anchor (so Mister P retrieval has somewhere
  // to bias). Server-side lookup means the client can't fabricate a
  // tier or category. Falls back to client-supplied values only
  // when source_slug is missing (legacy path; no current client
  // hits it).
  let resolvedTier = priority_tier;
  let resolvedCategory = category ?? null;
  if (source_slug) {
    const { data: doc } = await supabase
      .from('pov_docs')
      .select('priority_tier, category')
      .eq('slug', source_slug)
      .maybeSingle();
    if (!doc) {
      return NextResponse.json(
        { error: 'Unknown POV slug for source_slug.' },
        { status: 400 },
      );
    }
    resolvedTier = (doc.priority_tier as string | null) ?? undefined;
    resolvedCategory = (doc.category as string | null) ?? null;
  }
  if (!resolvedTier || !ALLOWED_TIERS.has(resolvedTier)) {
    return NextResponse.json({ error: 'Invalid tier' }, { status: 400 });
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
    category: resolvedCategory,
    priority_tier: resolvedTier,
    goal_type,
    source_slug: source_slug ?? null,
    baseline_stage: stage,
    status: 'active',
    source: goalSource,
  });
  if (insErr) {
    return NextResponse.json({ error: insErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
