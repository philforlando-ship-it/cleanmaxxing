'use client';

// Apnea screening card. Surfaces 4+ weeks after the user
// acknowledged the OTC supplement layer if rolling sleep avg is
// still poor. Narrowed scope: this is specifically about getting a
// sleep study, not about Rx sleep medications.

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { CMSpinner } from '@/components/cm-logo';

type Props = {
  weeksSinceOtcAck: number;
  rollingAvgHours: number | null;
};

export function ApneaScreeningCard({
  weeksSinceOtcAck,
  rollingAvgHours,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function surface() {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch(
          '/api/plan/sleep/surface-apnea-screening',
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
    <section className="mt-8 rounded-xl border-2 border-amber-300 bg-amber-50 p-5 dark:border-amber-700 dark:bg-amber-950/40">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="text-base font-medium text-amber-900 dark:text-amber-200">
          OTC layer not landing — check for apnea
        </h2>
        <span className="text-[11px] uppercase tracking-wider text-amber-700 dark:text-amber-300">
          {weeksSinceOtcAck}+ weeks on OTC
          {rollingAvgHours !== null
            ? ` · avg ${rollingAvgHours}h`
            : ''}
        </span>
      </div>
      <p className="mt-2 text-[14px] leading-relaxed text-amber-900 dark:text-amber-200">
        Behavioral + OTC supplement work has had a real run and sleep
        still isn&rsquo;t landing. The next conversation is a sleep
        study — specifically to rule in or out sleep apnea, which is
        the most-missed sleep variable past 35 and the only Rx path
        Mister P will recommend by category. Screening criteria worth
        matching against: loud snoring most nights, witnessed pauses
        in breathing, choking or gasping awakenings, morning headaches,
        daytime sleepiness despite 7+ hours, neck circumference over
        17″, BMI over 30. If 2+ of those match your pattern, that&rsquo;s
        a primary care + sleep study conversation, not another
        supplement.
      </p>
      {error && (
        <p className="mt-3 text-[12px] text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
      <div className="mt-4">
        <button
          type="button"
          onClick={surface}
          disabled={pending}
          className="rounded-lg bg-amber-900 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-amber-800 disabled:opacity-50 dark:bg-amber-200 dark:text-amber-950 dark:hover:bg-amber-300"
        >
          {pending
            ? 'Mister P is rewriting your plan…'
            : 'Acknowledge — moving to apnea screening'}
        </button>
        {pending && <CMSpinner size="xs" className="ml-3" />}
      </div>
    </section>
  );
}
