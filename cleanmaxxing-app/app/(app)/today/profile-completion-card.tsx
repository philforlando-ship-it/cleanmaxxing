// Profile completion nudge on /today. Renders while the user is
// below 80% — once they cross that threshold the surface stops
// earning its space, since the remaining fields are the
// less-essential ones (relationship, budget tier, etc.) and the
// daily note has more leverage on what calibrates Mister P.
// No dismissal, on purpose: cross 80% to make it disappear.

import Link from 'next/link';
import type { ProfileCompletion } from '@/lib/profile/completion';

const HIDE_THRESHOLD = 80;

type Props = {
  completion: ProfileCompletion;
};

export function ProfileCompletionCard({ completion }: Props) {
  if (completion.percentage >= HIDE_THRESHOLD) return null;
  const remaining = completion.total - completion.filled;

  return (
    <section className="rounded-xl border border-zinc-300 bg-zinc-50 p-6 dark:border-zinc-700 dark:bg-zinc-900">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-lg font-medium">Finish your profile</h2>
        <span className="shrink-0 text-xs text-zinc-500">
          {completion.percentage}% complete
        </span>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
        Mister P calibrates his answers from your stats and preferences. The
        more you fill in, the less generic his advice has to be.{' '}
        {remaining} {remaining === 1 ? 'field' : 'fields'} left.
      </p>
      <div
        className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={completion.percentage}
        aria-label={`Profile ${completion.percentage}% complete`}
      >
        <div
          className="h-full rounded-full bg-emerald-600 transition-all dark:bg-emerald-500"
          style={{ width: `${completion.percentage}%` }}
        />
      </div>
      <Link
        href="/profile"
        className="mt-4 inline-block rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
      >
        Open Profile →
      </Link>
    </section>
  );
}
