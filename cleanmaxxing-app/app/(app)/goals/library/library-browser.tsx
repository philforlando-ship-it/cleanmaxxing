'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { TierBadge } from '@/components/tier-badge';
import { TIER_ORDER, tierLabel } from '@/lib/goals/tier';

type Template = {
  source_slug: string;
  title: string;
  description: string;
  plain_language: string | null;
  category: string | null;
  priority_tier: string | null;
  goal_type: 'process' | 'outcome';
  already_active: boolean;
};

type BaselineStage = 'new' | 'light' | 'partial' | 'established';

const BASELINE_LABEL: Record<BaselineStage, string> = {
  new: 'Just starting',
  light: 'Some experience',
  partial: 'Mostly consistent',
  established: 'Already consistent',
};

type Props = {
  // POV slugs that have a published doc at content/povs/[slug].md. Used
  // to gate the "Read the full POV" link so it only renders when the
  // doc actually exists (gracefully handles missing corpus entries).
  availableSlugs: string[];
};

const CATEGORY_LABELS: Record<string, string> = {
  'biological-foundation': 'Biological Foundation',
  'structural-framing': 'Structural & Framing',
  'grooming-refinement': 'Grooming & Refinement',
  'behavioral-aesthetics': 'Behavioral',
  'perception-identity': 'Perception & Identity',
  'safety': 'Self-acceptance',
};

export function LibraryBrowser({ availableSlugs }: Props) {
  const router = useRouter();
  const availableSlugSet = useMemo(() => new Set(availableSlugs), [availableSlugs]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [busySlug, setBusySlug] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Baseline stage per template, keyed by source_slug. Defaults to 'new'
  // for any template the user hasn't adjusted.
  const [baselines, setBaselines] = useState<Record<string, BaselineStage>>({});
  // Soft goal-cap nudge state. When the server returns goal_limit_reached
  // for a given template, we stash the template here so the nudge can
  // render inline below that card. Confirming "Add anyway" re-posts with
  // force: true and clears this.
  const [capNudge, setCapNudge] = useState<{ template: Template; activeCount: number; cap: number } | null>(null);
  // Domain-overlap nudge state. When the server detects that the user
  // already has an active goal in the same life-area domain
  // (nutrition, training, etc.), it returns `domain_overlap` and the
  // conflicting goal title. Confirming "Add anyway" re-posts with
  // force_domain_override: true.
  const [overlapNudge, setOverlapNudge] = useState<{
    template: Template;
    domain: string;
    conflictingTitle: string;
  } | null>(null);

  async function load() {
    const res = await fetch('/api/goals/templates');
    if (!res.ok) {
      setError('Could not load library.');
      setLoading(false);
      return;
    }
    const data = await res.json();
    setTemplates(data.templates);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function addGoal(
    t: Template,
    opts: { force?: boolean; forceDomainOverride?: boolean } = {},
  ) {
    const { force = false, forceDomainOverride = false } = opts;
    setBusySlug(t.source_slug);
    setError(null);
    if (!force) setCapNudge(null);
    if (!forceDomainOverride) setOverlapNudge(null);

    const res = await fetch('/api/goals/add', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        source_slug: t.source_slug,
        title: t.title,
        description: t.description,
        category: t.category,
        priority_tier: t.priority_tier,
        goal_type: t.goal_type,
        baseline_stage: baselines[t.source_slug] ?? 'new',
        force: force || undefined,
        force_domain_override: forceDomainOverride || undefined,
      }),
    });
    setBusySlug(null);

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      if (body.error === 'domain_overlap' && !forceDomainOverride) {
        setOverlapNudge({
          template: t,
          domain: body.domain ?? 'this area',
          conflictingTitle: body.conflicting_title ?? 'an active goal',
        });
        return;
      }
      if (body.error === 'goal_limit_reached' && !force) {
        setCapNudge({
          template: t,
          activeCount: body.active_count ?? 0,
          cap: body.cap ?? 5,
        });
        return;
      }
      setError(body.error ?? 'Could not add goal.');
      return;
    }

    // Update in place so the "Already active" state reflects immediately
    setTemplates((prev) =>
      prev.map((x) => (x.source_slug === t.source_slug ? { ...x, already_active: true } : x))
    );
    setCapNudge(null);
    setOverlapNudge(null);
    router.refresh();
  }

  const categories = useMemo(
    () => Array.from(new Set(templates.map((t) => t.category).filter(Boolean))) as string[],
    [templates]
  );

  const filtered = useMemo(() => {
    if (categoryFilter === 'all') return templates;
    return templates.filter((t) => t.category === categoryFilter);
  }, [templates, categoryFilter]);

  // Group the filtered templates by tier so the hierarchy is visible in the
  // layout itself — Foundation on top, Polish at the bottom. Within a tier,
  // the API's score-based ordering is preserved.
  const grouped = useMemo(() => {
    const buckets = new Map<string, Template[]>();
    for (const t of filtered) {
      const key = t.priority_tier ?? 'other';
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key)!.push(t);
    }
    const orderedKeys = [
      ...TIER_ORDER.filter((k) => buckets.has(k)),
      ...Array.from(buckets.keys()).filter(
        (k) => !TIER_ORDER.includes(k as (typeof TIER_ORDER)[number])
      ),
    ];
    return orderedKeys.map((key) => ({
      tier: key,
      items: buckets.get(key) ?? [],
    }));
  }, [filtered]);

  if (loading) {
    return <p className="mt-8 text-sm text-zinc-500">Loading library…</p>;
  }

  return (
    <div>
      <div className="mt-8 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setCategoryFilter('all')}
          className={`rounded-full border px-3 py-1 text-xs ${
            categoryFilter === 'all'
              ? 'border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900'
              : 'border-zinc-300 text-zinc-700 dark:border-zinc-700 dark:text-zinc-300'
          }`}
        >
          All ({templates.length})
        </button>
        {categories.map((cat) => {
          const count = templates.filter((t) => t.category === cat).length;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => setCategoryFilter(cat)}
              className={`rounded-full border px-3 py-1 text-xs ${
                categoryFilter === cat
                  ? 'border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900'
                  : 'border-zinc-300 text-zinc-700 dark:border-zinc-700 dark:text-zinc-300'
              }`}
            >
              {CATEGORY_LABELS[cat] ?? cat} ({count})
            </button>
          );
        })}
      </div>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <div className="mt-6 flex flex-col gap-8">
        {grouped.map((group) => (
          <section key={group.tier}>
            <div className="mb-4 flex items-baseline gap-3 border-b-2 border-zinc-300 pb-2 dark:border-zinc-700">
              <h2 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
                {group.tier === 'other' ? 'Other' : tierLabel(group.tier)}
              </h2>
              <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-sm font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                {group.items.length}
              </span>
            </div>
            <ul className="flex flex-col gap-4">
              {group.items.map((t) => (
          <li
            key={t.source_slug}
            className={`rounded-xl border p-5 transition ${
              t.already_active
                ? 'border-zinc-200 bg-zinc-50 opacity-60 dark:border-zinc-800 dark:bg-zinc-900/50'
                : 'border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900'
            }`}
          >
            <div className="mb-2 flex items-center gap-2 text-xs">
              <TierBadge tier={t.priority_tier} />
              <span
                className={`rounded-full px-2 py-0.5 ${
                  t.goal_type === 'process'
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                    : 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                }`}
              >
                {t.goal_type}
              </span>
            </div>
            <h2 className="text-lg font-semibold leading-tight">{t.title}</h2>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              {t.description}
            </p>
            {t.plain_language && (
              <details className="mt-3">
                <summary className="cursor-pointer text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100">
                  What does this mean?
                </summary>
                <p className="mt-2 text-sm italic text-zinc-600 dark:text-zinc-400">
                  {t.plain_language}
                </p>
              </details>
            )}
            {!t.already_active && (
              <div className="mt-4">
                <label
                  htmlFor={`baseline-${t.source_slug}`}
                  className="block text-xs text-zinc-600 dark:text-zinc-400"
                >
                  How much of this are you already doing?
                </label>
                <select
                  id={`baseline-${t.source_slug}`}
                  value={baselines[t.source_slug] ?? 'new'}
                  onChange={(e) =>
                    setBaselines((prev) => ({
                      ...prev,
                      [t.source_slug]: e.target.value as BaselineStage,
                    }))
                  }
                  className="mt-1.5 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                >
                  <option value="new">{BASELINE_LABEL.new}</option>
                  <option value="light">{BASELINE_LABEL.light}</option>
                  <option value="partial">{BASELINE_LABEL.partial}</option>
                  <option value="established">{BASELINE_LABEL.established}</option>
                </select>
              </div>
            )}
            <div className="mt-4 flex items-center gap-4">
              {t.already_active ? (
                <span className="text-xs text-zinc-500">Already active</span>
              ) : (
                <button
                  type="button"
                  onClick={() => addGoal(t)}
                  disabled={busySlug === t.source_slug}
                  className="rounded-lg border border-zinc-300 px-4 py-2 text-sm hover:bg-zinc-100 disabled:opacity-60 dark:border-zinc-700 dark:hover:bg-zinc-800"
                >
                  {busySlug === t.source_slug ? 'Adding…' : 'Add this goal'}
                </button>
              )}
              {availableSlugSet.has(t.source_slug) && (
                <Link
                  href={`/povs/${t.source_slug}`}
                  className="text-xs text-zinc-600 underline decoration-dotted underline-offset-2 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                >
                  Read the full POV →
                </Link>
              )}
            </div>
            {capNudge?.template.source_slug === t.source_slug && (
              <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/30">
                <p className="text-sm text-amber-900 dark:text-amber-200">
                  {`You already have ${capNudge.activeCount} active goals. Most people make faster progress by keeping the active stack to ${capNudge.cap}. Add this only if it replaces something or directly supports your current focus.`}
                </p>
                <div className="mt-3 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => addGoal(t, { force: true })}
                    disabled={busySlug === t.source_slug}
                    className="rounded-lg bg-zinc-900 px-4 py-2 text-xs font-medium text-white disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
                  >
                    Add anyway
                  </button>
                  <button
                    type="button"
                    onClick={() => setCapNudge(null)}
                    className="text-xs text-zinc-600 underline dark:text-zinc-400"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
            {overlapNudge?.template.source_slug === t.source_slug && (
              <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/30">
                <p className="text-sm text-amber-900 dark:text-amber-200">
                  {`You already have an active ${overlapNudge.domain.replace('-', ' ')} goal — “${overlapNudge.conflictingTitle}”. Stacking goals in the same area usually means you have one big system, not two goals. Pick the one to lead with this month and merge the rest as supporting habits.`}
                </p>
                <div className="mt-3 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => addGoal(t, { forceDomainOverride: true })}
                    disabled={busySlug === t.source_slug}
                    className="rounded-lg bg-zinc-900 px-4 py-2 text-xs font-medium text-white disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
                  >
                    Add anyway
                  </button>
                  <button
                    type="button"
                    onClick={() => setOverlapNudge(null)}
                    className="text-xs text-zinc-600 underline dark:text-zinc-400"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="mt-8 text-sm text-zinc-500">No goals in this category.</p>
      )}
    </div>
  );
}
