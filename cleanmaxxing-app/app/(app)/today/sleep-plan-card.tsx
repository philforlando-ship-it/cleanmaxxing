// /today tile for the sleep plan. Server component — same shape as
// HairPlanCard / StylePlanCard / FacialHairPlanCard. Two states:
// pending CTA / done quiet link. Parent (today/page.tsx) gates on
// focus_areas including 'sleep'. The existing SleepLogCard (tracker)
// is unconditional and unrelated — that one runs every day; this is
// the assessment-driven plan.

import Link from 'next/link';

type Props = {
  state: 'pending' | 'done';
};

export function SleepPlanCard({ state }: Props) {
  if (state === 'done') {
    return (
      <section className="rounded-xl border border-zinc-200 bg-white px-5 py-3 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Sleep plan
          </span>
          <Link
            href="/plan/sleep"
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
      <h2 className="text-lg font-medium">Get your sleep plan</h2>
      <p className="mt-2 text-[14px] leading-relaxed text-zinc-700 dark:text-zinc-300">
        Four short questions about your concern, what you think&rsquo;s
        blocking you, and what you&rsquo;ve already tried. Mister P writes
        you a short, specific plan and uses your last seven logged nights
        as context.
      </p>
      <div className="mt-4">
        <Link
          href="/plan/sleep"
          className="inline-block rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          Start
        </Link>
      </div>
    </section>
  );
}
