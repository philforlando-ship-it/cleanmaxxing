import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { templateBySlug } from '@/content/goal-templates';

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
  // Optional finishline (YYYY-MM-DD). Null preserves the
  // existing open-ended behavior. UI duration inputs ("for 8
  // weeks") resolve to a concrete date client-side before posting.
  target_date?: string | null;
  // Set by the client when the user has acknowledged a same-domain
  // overlap warning and still wants to proceed. The server returns
  // a `domain_overlap` flag instead of inserting; the retry sets
  // this flag to bypass the check.
  force_domain_override?: boolean;
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
    target_date,
    force_domain_override,
  } = body;
  const goalSource: 'user_created' | 'system_suggested' =
    source === 'user_created' ? 'user_created' : 'system_suggested';

  // Validate target_date shape if supplied. Strict YYYY-MM-DD so
  // a malformed client can't write garbage. Null/undefined are
  // both fine — the column stays empty.
  let resolvedTargetDate: string | null = null;
  if (target_date !== null && target_date !== undefined && target_date !== '') {
    if (typeof target_date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(target_date)) {
      return NextResponse.json(
        { error: 'Invalid target_date — use YYYY-MM-DD.' },
        { status: 400 },
      );
    }
    resolvedTargetDate = target_date;
  }

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

  // Domain-overlap warning. Catches the failure mode where users
  // stack four nutrition goals (macros + protein + meal-plan +
  // appetite) and feel like they have four goals when they really
  // have one big food system. Only fires for slugs that resolve to
  // a known template; custom goals (no matching template entry) do
  // not gate on this — they have their own free-form intent and
  // weren't part of the curated overlap analysis.
  const newDomain = source_slug ? templateBySlug(source_slug)?.domain ?? null : null;
  if (newDomain && !force_domain_override) {
    const { data: activeRows } = await supabase
      .from('goals')
      .select('title, source_slug')
      .eq('user_id', user.id)
      .eq('status', 'active');
    const activeList = (activeRows ?? []) as Array<{
      title: string;
      source_slug: string | null;
    }>;
    const overlap = activeList.find((g) => {
      if (!g.source_slug) return false;
      const tmpl = templateBySlug(g.source_slug);
      return tmpl?.domain === newDomain;
    });
    if (overlap) {
      return NextResponse.json(
        {
          error: 'domain_overlap',
          domain: newDomain,
          conflicting_title: overlap.title,
        },
        { status: 409 },
      );
    }
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
    target_date: resolvedTargetDate,
  });
  if (insErr) {
    return NextResponse.json({ error: insErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
