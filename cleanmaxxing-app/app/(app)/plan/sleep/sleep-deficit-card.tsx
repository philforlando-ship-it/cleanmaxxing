// SleepDeficitCard — C2 from the May 7 brain dump.
//
// Surfaces only when the same detector that drives /today's
// sleep_deficit_7d contextual prompt is firing AND the user has
// completed the sleep assessment. Renders the user's selected
// blockers WITH per-blocker tailored guidance side-by-side, so the
// user can see the full diagnostic surface in one place rather than
// mentally re-deriving it from the report prose.
//
// Design choice: this is informational, not interactive. No "pick one
// to commit to" button — that's what the existing daily-commitments
// panel + the weekly review surface already do. This card just makes
// the diagnostic visible at the moment the deficit is active.

import { BLOCKER_HINT, BLOCKER_LABEL } from '@/lib/sleep/blocker-hints';
import type { SleepBiggestBlocker } from '@/lib/sleep/types';

type Props = {
  avgHours: number;
  severity: 'mild' | 'severe';
  blockers: ReadonlyArray<SleepBiggestBlocker>;
  loggedNights: number;
};

export function SleepDeficitCard({
  avgHours,
  severity,
  blockers,
  loggedNights,
}: Props) {
  const avgStr = avgHours.toFixed(1);
  const headlineCopy =
    severity === 'severe'
      ? `Below 5.5 hours isn't recovery debt — it's a substrate-level limit on everything else. Strength stalls, hunger spikes, mood narrows. Most of what you're working on stalls until this moves.`
      : `Under 6.5 hours is where downstream effects start showing — recovery between strength sessions, cravings on the cut, irritability without an obvious cause.`;

  return (
    <section
      className={`mt-10 rounded-xl border p-5 ${
        severity === 'severe'
          ? 'border-amber-300 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30'
          : 'border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950/40'
      }`}
    >
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-base font-medium text-zinc-900 dark:text-zinc-100">
          Recovery floor — last seven nights
        </h2>
        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          {avgStr}h avg · {loggedNights} logged
        </span>
      </div>
      <p className="mt-2 text-[14px] leading-relaxed text-zinc-700 dark:text-zinc-300">
        {headlineCopy}
      </p>

      {blockers.length > 0 ? (
        <>
          <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Your selected blockers — one specific move each
          </p>
          <ul className="mt-2 space-y-3">
            {blockers.map((b) => (
              <li
                key={b}
                className="rounded-md border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900"
              >
                <p className="text-[13px] font-medium text-zinc-900 dark:text-zinc-100">
                  {BLOCKER_LABEL[b]}
                </p>
                <p className="mt-1 text-[13px] leading-relaxed text-zinc-600 dark:text-zinc-400">
                  {BLOCKER_HINT[b]}
                </p>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[12px] leading-relaxed text-zinc-500 dark:text-zinc-400">
            Pick one for this week. The win comes from running one
            experiment cleanly, not stacking three at once.
          </p>
        </>
      ) : (
        <p className="mt-3 text-[13px] leading-relaxed text-zinc-600 dark:text-zinc-400">
          You marked nothing obvious as the blocker. The single
          highest-leverage move when the cause isn&rsquo;t clear is
          consistency — same wake time on weekends as weekdays for two
          weeks. If sleep still won&rsquo;t move after that, edit your
          assessment and Mister P will rewrite the plan with whatever
          you&rsquo;ve learned.
        </p>
      )}
    </section>
  );
}
