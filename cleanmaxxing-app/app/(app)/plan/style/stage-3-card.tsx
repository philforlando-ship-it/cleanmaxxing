'use client';

// Stage 3 card on /plan/style. Fit calibration — authored
// modifier-conditional principles. Two states:
//   1. not acknowledged → render principles + acknowledge button
//   2. acknowledged    → collapsed summary (terminal v0 state)

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { FitPrinciple } from '@/lib/style/fit-calibration-content';

type Props = {
  principles: ReadonlyArray<FitPrinciple>;
  acknowledgedAt: string | null;
};

export function StyleStage3Card({ principles, acknowledgedAt }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const isAcknowledged = acknowledgedAt !== null;

  function acknowledge() {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch('/api/plan/style/stage-3/acknowledge', {
          method: 'POST',
        });
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as {
            error?: string;
          };
          throw new Error(body.error ?? `Request failed (${res.status})`);
        }
        router.refresh();
      } catch (err) {
        setError((err as Error).message);
      }
    });
  }

  if (isAcknowledged) {
    return (
      <section className="mt-10 rounded-xl border border-zinc-200 bg-white px-5 py-3 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-sm">
          <span className="text-zinc-700 dark:text-zinc-300">
            <span className="font-medium">Stage 3 — Fit calibration</span>
            <span className="text-zinc-500"> · acknowledged</span>
          </span>
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            {new Date(acknowledgedAt!).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
            })}
          </span>
        </div>
      </section>
    );
  }

  return (
    <section className="mt-10 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
        Stage 3 — Fit calibration
      </h2>
      <p className="mt-2 text-[14px] leading-relaxed text-zinc-700 dark:text-zinc-300">
        These principles apply to everything you already own and
        everything you’ll buy from here. Read once, internalize, then
        every future purchase passes these checks.
      </p>

      <ul className="mt-6 space-y-5">
        {principles.map((p) => (
          <li
            key={p.slug}
            className="rounded-md border border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950"
          >
            <p className="text-[14px] font-semibold text-zinc-900 dark:text-zinc-100">
              {p.title}
            </p>
            <p className="mt-1.5 text-[13px] leading-relaxed text-zinc-700 dark:text-zinc-300">
              {p.body}
            </p>
          </li>
        ))}
      </ul>

      {error && (
        <p className="mt-4 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      <div className="mt-6 flex items-center gap-3">
        <button
          type="button"
          onClick={acknowledge}
          disabled={pending}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {pending ? 'Saving…' : 'Got it — these are the rules'}
        </button>
      </div>
    </section>
  );
}
