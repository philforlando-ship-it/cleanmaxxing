'use client';

// Minoxidil-for-beard considering stage card. Surfaces on
// /plan/facial-hair when:
//   - any density-by-area zone reads 'patchy' or 'not_present' (or
//     legacy growth_quality is 'patchy' / 'very_patchy'), AND
//   - the user's goal is 'grow_more' or 'try_new_style', AND
//   - minoxidil_for_beard_started_at is null
//
// The drug is the same molecule as scalp minoxidil — but
// profile.current_interventions can't separate beard use from scalp
// use, so we track it here. Marking "I started this" stamps the
// timestamp and re-runs the report. The prompt then shifts to
// month-band framing (0-3 mo shedding, 3-6 mo early progress, 12+ mo
// evaluation).

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { CMSpinner } from '@/components/cm-logo';

export function MinoxidilConsideringCard() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function start() {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch(
          '/api/plan/facial-hair/start-minoxidil-for-beard',
          { method: 'POST' },
        );
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as {
            error?: string;
            message?: string;
          };
          throw new Error(
            body.message ?? body.error ?? `Request failed (${res.status})`,
          );
        }
        router.refresh();
      } catch (err) {
        setError((err as Error).message);
      }
    });
  }

  return (
    <section className="mt-8 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="text-base font-medium text-zinc-900 dark:text-zinc-100">
        Considering minoxidil for the patches?
      </h2>
      <p className="mt-2 text-[14px] leading-relaxed text-zinc-700 dark:text-zinc-300">
        Topical minoxidil 5% (the same drug used for scalp hair) has
        off-label use for filling in patchy facial hair. Realistic
        timeline is 12–24 months for visible terminal-hair conversion —
        not weeks, not a few months. The before/afters that look
        convincing run 12+ months of consistent daily use.
      </p>
      <p className="mt-3 text-[14px] leading-relaxed text-zinc-700 dark:text-zinc-300">
        Months 3–4 commonly involve a shedding phase that looks like
        regression and is the single most common reason people stop. The
        shedding is the transition from vellus hairs to stronger
        terminal growth. Stopping during shedding is the wrong move.
      </p>
      <p className="mt-3 text-[14px] leading-relaxed text-zinc-700 dark:text-zinc-300">
        Side effects are real: dryness, flaking, irritation, occasional
        acne breakouts in the application area. Genetics set the
        ceiling — this isn&rsquo;t a guaranteed transformation.
        It&rsquo;s a months-long bet that may compound if your patches
        are responsive.
      </p>
      <p className="mt-3 text-[13px] text-zinc-600 dark:text-zinc-400">
        If you decide to start, mark below. Mister P will re-run your
        plan with the protocol in scope — the shedding phase, the
        application cadence, and what to keep doing in parallel.
      </p>
      {error && (
        <p className="mt-3 text-[12px] text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
      <div className="mt-4">
        <button
          type="button"
          onClick={start}
          disabled={pending}
          className="rounded-lg bg-zinc-900 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {pending
            ? 'Mister P is rewriting your plan…'
            : 'I started — re-run my plan'}
        </button>
        {pending && <CMSpinner size="xs" className="ml-3" />}
      </div>
    </section>
  );
}
