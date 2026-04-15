'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { CheckpointSummary } from '@/lib/checkpoint/service';

type Props = {
  summary: CheckpointSummary;
};

export function MonthlyCheckpointCard({ summary }: Props) {
  const router = useRouter();
  const [dismissed, setDismissed] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function dismiss() {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch('/api/checkpoint', { method: 'POST' });
        if (!res.ok) throw new Error(`Dismiss failed (${res.status})`);
        setDismissed(true);
        router.refresh();
      } catch (err) {
        setError((err as Error).message);
      }
    });
  }

  if (dismissed) return null;

  const pct =
    summary.completion_rate !== null
      ? Math.round(summary.completion_rate * 100)
      : null;

  return (
    <section className="rounded-xl border border-amber-300 bg-amber-50 p-6 dark:border-amber-900 dark:bg-amber-950/40">
      <div className="flex items-baseline justify-between">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">
            Day {summary.days_since_start} checkpoint
          </div>
          <h2 className="mt-1 text-lg font-medium">A month in.</h2>
        </div>
        <button
          type="button"
          onClick={dismiss}
          disabled={pending}
          className="text-xs text-zinc-500 hover:text-zinc-700 disabled:opacity-50 dark:text-zinc-400 dark:hover:text-zinc-200"
        >
          Dismiss
        </button>
      </div>

      <div className="mt-4 space-y-4 text-sm">
        {summary.confidence_from !== null && summary.confidence_to !== null ? (
          <p className="text-zinc-800 dark:text-zinc-200">
            Your self-confidence moved from{' '}
            <strong>{summary.confidence_from}</strong> to{' '}
            <strong>{summary.confidence_to}</strong> — {summary.delta_phrase}.
          </p>
        ) : (
          <p className="text-zinc-700 dark:text-zinc-300">
            No weekly reflections yet. Save one this week and the next
            checkpoint will show your trend.
          </p>
        )}

        {pct !== null ? (
          <p className="text-zinc-800 dark:text-zinc-200">
            You completed <strong>{pct}%</strong> of your goal check-ins (
            {summary.completed_goal_check_ins} of {summary.total_goal_check_ins}).
          </p>
        ) : (
          <p className="text-zinc-700 dark:text-zinc-300">
            No daily check-ins logged yet.
          </p>
        )}
      </div>

      {summary.suggestions.length > 0 && (
        <div className="mt-5">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
            Ready to layer in something new?
          </div>
          <ul className="mt-2 space-y-2">
            {summary.suggestions.map((g) => (
              <li
                key={g.source_slug}
                className="rounded-lg border border-amber-200 bg-white p-3 dark:border-amber-900/60 dark:bg-zinc-900"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    {g.title}
                  </div>
                  <span className="text-[10px] uppercase tracking-wider text-zinc-500">
                    {g.priority_tier}
                  </span>
                </div>
                {g.plain_language && (
                  <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                    {g.plain_language}
                  </p>
                )}
              </li>
            ))}
          </ul>
          <a
            href="/goals/library"
            className="mt-3 inline-block rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Browse the library
          </a>
        </div>
      )}

      {error && (
        <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </section>
  );
}
