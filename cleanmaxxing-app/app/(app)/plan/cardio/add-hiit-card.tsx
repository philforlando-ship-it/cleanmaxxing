'use client';

// Add HIIT layer card. Shows 8+ weeks after the user added their
// Zone 2 base (zone_2_layer_started_at), or 8+ weeks after the
// report if they started with structured Zone 2 (days_per_week
// other than '0_days'). Most appropriate for ages 35+ or
// primary_role='cardiovascular_health' — POV 23's VO2max framing.

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { CMSpinner } from '@/components/cm-logo';

type Props = {
  weeksOnZone2Base: number;
  age: number | null;
};

export function AddHiitCard({ weeksOnZone2Base, age }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const ready = weeksOnZone2Base >= 8;
  const isOlder = age !== null && age >= 35;

  function add() {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch('/api/plan/cardio/add-hiit', {
          method: 'POST',
        });
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
    <section
      className={
        ready
          ? 'mt-8 rounded-xl border-2 border-emerald-500 bg-emerald-50 p-5 dark:border-emerald-600 dark:bg-emerald-950/30'
          : 'mt-8 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900'
      }
    >
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="text-base font-medium text-zinc-900 dark:text-zinc-100">
          {ready
            ? 'Zone 2 base built. Add the HIIT layer.'
            : 'Zone 2 base — building'}
        </h2>
        <span className="text-[11px] uppercase tracking-wider text-zinc-500">
          {weeksOnZone2Base} of 8+ weeks
        </span>
      </div>
      {ready ? (
        <p className="mt-2 text-[14px] leading-relaxed text-zinc-800 dark:text-zinc-200">
          You&rsquo;ve held a Zone 2 base for 8+ weeks — the
          mitochondrial adaptations that make HIIT productive are in
          place. The cleanest add: <strong>Norwegian 4×4</strong> — 4
          rounds of 4 minutes at near-max effort (85–95% max HR), 3
          minutes active recovery between, 1×/week. 10–15 minutes of
          quality work per session.{' '}
          {isOlder
            ? 'At your age, this is one of the highest-leverage VO₂max moves available — the metric tracks all-cause mortality more strongly than smoking or BMI.'
            : 'Adding HIIT here builds VO₂max meaningfully without compromising the Zone 2 work.'}
        </p>
      ) : (
        <p className="mt-2 text-[14px] leading-relaxed text-zinc-700 dark:text-zinc-300">
          Stay on Zone 2. The base needs ~8 weeks of consistency before
          HIIT becomes productive — too soon and you stack fatigue
          without the aerobic adaptations to absorb it.
        </p>
      )}
      {error && (
        <p className="mt-3 text-[12px] text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
      {ready && (
        <div className="mt-4">
          <button
            type="button"
            onClick={add}
            disabled={pending}
            className="rounded-lg bg-emerald-700 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-emerald-600 disabled:opacity-50 dark:bg-emerald-600 dark:hover:bg-emerald-500"
          >
            {pending
              ? 'Mister P is rewriting your plan…'
              : 'Add HIIT layer and re-run plan'}
          </button>
          {pending && <CMSpinner size="xs" className="ml-3" />}
        </div>
      )}
    </section>
  );
}
