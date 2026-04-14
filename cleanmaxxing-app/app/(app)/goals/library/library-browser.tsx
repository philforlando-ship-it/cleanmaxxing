'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

type Template = {
  source_slug: string;
  title: string;
  description: string;
  category: string | null;
  priority_tier: string | null;
  goal_type: 'process' | 'outcome';
  already_active: boolean;
};

const CATEGORY_LABELS: Record<string, string> = {
  'biological-foundation': 'Biological Foundation',
  'structural-framing': 'Structural & Framing',
  'grooming-refinement': 'Grooming & Refinement',
  'behavioral-aesthetics': 'Behavioral',
  'perception-identity': 'Perception & Identity',
  'safety': 'Self-acceptance',
};

function tierLabel(tier: string | null): string {
  if (!tier) return '';
  switch (tier) {
    case 'tier-1': return 'Foundation';
    case 'tier-2': return 'High impact';
    case 'tier-3': return 'Refinement';
    case 'tier-4': return 'Top performers';
    case 'tier-5': return 'Polish';
    case 'conditional-tier-1': return 'Situational';
    default: return tier;
  }
}

export function LibraryBrowser() {
  const router = useRouter();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [busySlug, setBusySlug] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  async function addGoal(t: Template) {
    setBusySlug(t.source_slug);
    setError(null);
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
      }),
    });
    setBusySlug(null);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? 'Could not add goal.');
      return;
    }
    // Update in place so the "Already active" state reflects immediately
    setTemplates((prev) =>
      prev.map((x) => (x.source_slug === t.source_slug ? { ...x, already_active: true } : x))
    );
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

      <ul className="mt-6 flex flex-col gap-4">
        {filtered.map((t) => (
          <li
            key={t.source_slug}
            className={`rounded-xl border p-5 transition ${
              t.already_active
                ? 'border-zinc-200 bg-zinc-50 opacity-60 dark:border-zinc-800 dark:bg-zinc-900/50'
                : 'border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900'
            }`}
          >
            <div className="mb-2 flex items-center gap-2 text-xs">
              <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                {tierLabel(t.priority_tier)}
              </span>
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
            <div className="mt-4">
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
            </div>
          </li>
        ))}
      </ul>

      {filtered.length === 0 && (
        <p className="mt-8 text-sm text-zinc-500">No goals in this category.</p>
      )}
    </div>
  );
}
