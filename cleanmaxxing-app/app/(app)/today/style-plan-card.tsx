// /today tile for the style plan. Server component — same shape as
// HairPlanCard. Two states: pending CTA / done quiet link. Parent
// (today/page.tsx) gates on focus_areas including 'style'.

import Link from 'next/link';

type Props = {
  state: 'pending' | 'done';
};

export function StylePlanCard({ state }: Props) {
  if (state === 'done') {
    return (
      <section className="rounded-xl border border-zinc-200 bg-white px-5 py-3 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Style plan
          </span>
          <Link
            href="/plan/style"
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
      <h2 className="text-lg font-medium">Get your style plan</h2>
      <p className="mt-2 text-[14px] leading-relaxed text-zinc-700 dark:text-zinc-300">
        Four short questions about your frame, current archetype, and where
        you&rsquo;re moving. Mister P writes you a short, specific plan.
        About five minutes.
      </p>
      <div className="mt-4">
        <Link
          href="/plan/style"
          className="inline-block rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          Start
        </Link>
      </div>
    </section>
  );
}
