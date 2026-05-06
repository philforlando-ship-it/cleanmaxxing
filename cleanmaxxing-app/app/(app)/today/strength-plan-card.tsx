// /today tile for the strength training plan. Server component.
// Two states: pending CTA / done quiet link. Parent gates on
// focus_areas.includes('fitness'). Distinct from the workout
// tracker card (WorkoutLogCard) — that's the daily session logger.

import Link from 'next/link';

type Props = {
  state: 'pending' | 'done';
};

export function StrengthPlanCard({ state }: Props) {
  if (state === 'done') {
    return (
      <section className="rounded-xl border border-zinc-200 bg-white px-5 py-3 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Strength plan
          </span>
          <Link
            href="/plan/strength"
            className="text-xs text-zinc-500 underline decoration-dotted underline-offset-2 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
          >
            Read your plan
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="text-lg font-medium">Get your strength plan</h2>
      <p className="mt-2 text-[14px] leading-relaxed text-zinc-700 dark:text-zinc-300">
        Four short questions about your goal, days available, equipment, and
        current pattern. Mister P writes a specific plan grounded in
        Dr. Mike Israetel&rsquo;s hypertrophy framework — no junk volume, no
        maxing out. About five minutes.
      </p>
      <div className="mt-4">
        <Link
          href="/plan/strength"
          className="inline-block rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          Start
        </Link>
      </div>
    </section>
  );
}
