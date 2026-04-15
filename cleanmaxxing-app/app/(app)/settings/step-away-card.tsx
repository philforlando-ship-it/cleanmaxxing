'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

type Props = {
  initialPaused: boolean;
};

export function StepAwayCard({ initialPaused }: Props) {
  const [paused, setPaused] = useState(initialPaused);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function toggle() {
    setError(null);
    const next = !paused;
    startTransition(async () => {
      try {
        const res = await fetch('/api/settings/tracking-paused', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ paused: next }),
        });
        if (!res.ok) throw new Error(`Failed (${res.status})`);
        setPaused(next);
        // Refresh sibling server components (the Today screen state
        // pivots on this flag — chart and chat stay, check-in and
        // reflection hide behind a banner).
        router.refresh();
      } catch (err) {
        setError((err as Error).message);
      }
    });
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-medium">Step away</h2>
        <span className="text-xs uppercase tracking-wider text-zinc-500">
          {paused ? 'paused' : 'active'}
        </span>
      </div>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        Pause daily check-ins and tracking without losing your goals or
        progress. Taking a break is a legitimate and sometimes correct
        choice. Your goals will be here when you come back.
      </p>

      {error && (
        <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      <button
        type="button"
        onClick={toggle}
        disabled={pending}
        className={
          paused
            ? 'mt-4 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200'
            : 'mt-4 rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800'
        }
      >
        {pending
          ? paused
            ? 'Resuming…'
            : 'Pausing…'
          : paused
          ? 'Resume tracking'
          : 'Step away'}
      </button>
    </div>
  );
}
