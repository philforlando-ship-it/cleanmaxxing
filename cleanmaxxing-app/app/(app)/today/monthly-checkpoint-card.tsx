'use client';

// Monthly checkpoint card on /reflection. Slim month-in reflection
// sitting between the weekly cadence (weekly letter + weekly
// reflection) and the quarterly survey. Surfaces:
//   - days-since-start tally
//   - confidence delta (first reflection vs latest) — same dimensions
//     the weekly chart uses, framed here as a 30-day pull-back
//   - "what you said preoccupied you" mirror, prompting a re-read of
//     whether the original framing still holds
//
// Goals-era content (completion rate, suggested adds, per-goal
// insights) retired in Sub-ship B (2026-05-10). Dismissal persists
// via survey_responses so the card doesn't reappear.

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
            No weekly reflections yet. Save one this week and next
            month&rsquo;s checkpoint will show your trend.
          </p>
        )}
      </div>

      {summary.specific_thing && (
        <div className="mt-5 rounded-lg border border-amber-200 bg-white/60 p-4 text-sm leading-relaxed text-zinc-800 dark:border-amber-900/60 dark:bg-zinc-900/60 dark:text-zinc-200">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
            What you said preoccupied you
          </div>
          <p className="mt-2 italic text-zinc-700 dark:text-zinc-300">
            &ldquo;{summary.specific_thing}&rdquo;
          </p>
          <p className="mt-2 text-zinc-700 dark:text-zinc-300">
            A month on &mdash; is this still the thing? If it&rsquo;s shifted,
            that&rsquo;s useful data. Mister P can help you think through it.
          </p>
        </div>
      )}

      {error && (
        <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </section>
  );
}
