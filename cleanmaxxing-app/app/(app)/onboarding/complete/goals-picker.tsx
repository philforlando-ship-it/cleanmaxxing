'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

type Goal = {
  source_slug: string;
  title: string;
  description: string;
  category: string;
  priority_tier: string;
  goal_type: 'process' | 'outcome';
  score: number;
};

type SuggestionsResponse = {
  suggested: Goal[];
  alternatives: Goal[];
};

function tierLabel(tier: string): string {
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

export function GoalsPicker() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [current, setCurrent] = useState<Goal[]>([]);
  const [alternatives, setAlternatives] = useState<Goal[]>([]);
  const [submitting, startSubmitTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/onboarding/suggestions');
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          if (!cancelled) setError(body.error ?? 'Could not load suggestions.');
          return;
        }
        const data: SuggestionsResponse = await res.json();
        if (cancelled) return;
        setCurrent(data.suggested);
        setAlternatives(data.alternatives);
      } catch {
        if (!cancelled) setError('Network error loading suggestions.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function swap(index: number) {
    if (alternatives.length === 0) return;
    const [next, ...rest] = alternatives;
    const replaced = current[index];
    const nextCurrent = [...current];
    nextCurrent[index] = next;
    setCurrent(nextCurrent);
    setAlternatives([...rest, replaced]);
  }

  async function accept() {
    setError(null);
    const res = await fetch('/api/goals/accept', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        goals: current.map(({ source_slug, title, description, category, priority_tier, goal_type }) => ({
          source_slug,
          title,
          description,
          category,
          priority_tier,
          goal_type,
        })),
      }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? 'Could not save goals.');
      return;
    }
    startSubmitTransition(() => {
      router.push('/today');
      router.refresh();
    });
  }

  if (loading) {
    return <p className="text-sm text-zinc-500">Building your suggestions…</p>;
  }

  if (error && current.length === 0) {
    return (
      <div>
        <p className="text-sm text-red-600">{error}</p>
        <button
          type="button"
          onClick={() => location.reload()}
          className="mt-4 rounded-lg border border-zinc-300 px-4 py-2 text-sm dark:border-zinc-700"
        >
          Try again
        </button>
      </div>
    );
  }

  if (current.length === 0) {
    return (
      <p className="text-sm text-zinc-500">
        No suggestions matched your profile. That&rsquo;s unusual &mdash; please contact support.
      </p>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <ul className="flex flex-col gap-4">
        {current.map((goal, i) => (
          <li
            key={goal.source_slug + i}
            className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div className="mb-2 flex items-center gap-2 text-xs">
              <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                {tierLabel(goal.priority_tier)}
              </span>
              <span
                className={`rounded-full px-2 py-0.5 ${
                  goal.goal_type === 'process'
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                    : 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                }`}
              >
                {goal.goal_type}
              </span>
            </div>
            <h2 className="text-lg font-semibold leading-tight">{goal.title}</h2>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              {goal.description}
            </p>
            {goal.goal_type === 'outcome' && (
              <p className="mt-2 text-xs italic text-zinc-500">
                Outcome goals work well for some people and trigger others. Process goals are safer by default.
              </p>
            )}
            <button
              type="button"
              onClick={() => swap(i)}
              disabled={alternatives.length === 0}
              className="mt-4 text-xs text-zinc-600 underline disabled:opacity-40 dark:text-zinc-400"
            >
              Swap this one
            </button>
          </li>
        ))}
      </ul>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <div className="mt-8">
        <button
          type="button"
          onClick={accept}
          disabled={submitting}
          className="w-full rounded-lg bg-zinc-900 px-6 py-3 text-sm font-medium text-white disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
        >
          Start with these
        </button>
        <p className="mt-3 text-center text-xs text-zinc-500">
          You can add, swap, or pause goals any time from /goals.
        </p>
      </div>
    </div>
  );
}
