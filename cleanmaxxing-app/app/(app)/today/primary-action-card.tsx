// Phase A of the /today redesign — the single primary action surfaced
// at the top of the page. Decreasing-prominence hierarchy starts here:
// THIS card is the loudest thing on /today, everything else is calmer.
//
// Server component. The picker runs server-side; this just renders.

import Link from 'next/link';
import type { PrimaryAction } from '@/lib/today/types';

type Props = {
  action: PrimaryAction;
};

export function PrimaryActionCard({ action }: Props) {
  // The 'all_quiet' kind is informational rather than a CTA. Keep it
  // visually quieter than the other variants — the action button on
  // an "all systems go" card shouldn't pull attention from the rest
  // of the page.
  const isQuiet = action.kind === 'all_quiet';

  // Concerning side effects get a subtle amber tint to signal medical
  // urgency without blowing past the calm-product posture. No red.
  const isConcerning = action.kind === 'pattern_d_concerning';

  const containerClass = isQuiet
    ? 'rounded-xl border border-zinc-200 bg-zinc-50 px-5 py-4 dark:border-zinc-800 dark:bg-zinc-900/40'
    : isConcerning
      ? 'rounded-xl border border-amber-300 bg-amber-50 p-6 dark:border-amber-900 dark:bg-amber-950/40'
      : 'rounded-xl border border-zinc-300 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-900';

  return (
    <section className={containerClass}>
      <h2
        className={
          isQuiet
            ? 'text-base font-medium text-zinc-700 dark:text-zinc-300'
            : 'text-xl font-semibold text-zinc-900 dark:text-zinc-100'
        }
      >
        {action.title}
      </h2>
      <p
        className={
          isQuiet
            ? 'mt-1 text-[13px] leading-relaxed text-zinc-600 dark:text-zinc-400'
            : 'mt-2 text-[14px] leading-relaxed text-zinc-700 dark:text-zinc-200'
        }
      >
        {action.body}
      </p>
      <div className={isQuiet ? 'mt-3' : 'mt-5'}>
        <Link
          href={action.cta_href}
          className={
            isQuiet
              ? 'text-xs text-zinc-600 underline decoration-dotted underline-offset-2 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
              : isConcerning
                ? 'inline-block rounded-lg bg-amber-700 px-4 py-2 text-sm font-medium text-white hover:bg-amber-800'
                : 'inline-block rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200'
          }
        >
          {action.cta_label}
        </Link>
      </div>
    </section>
  );
}
