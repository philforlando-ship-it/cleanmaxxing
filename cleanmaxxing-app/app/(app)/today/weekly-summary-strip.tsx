// Rolling 7-day check-in total, rendered under the daily check-in card.
// Intentionally quiet: count, not streak; no emojis, no celebratory copy.
// The horizontal bar gives a glanceable proportion read without turning
// the number into a score.

import type { WeeklyCheckInSummary } from '@/lib/check-in/service';

type Props = {
  summary: WeeklyCheckInSummary;
};

export function WeeklySummaryStrip({ summary }: Props) {
  if (summary.goalCount === 0 || summary.possible === 0) return null;

  const pct = Math.min(
    100,
    Math.max(0, Math.round((summary.ticked / summary.possible) * 100)),
  );

  return (
    <div className="px-1">
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        This week: {summary.ticked}/{summary.possible} boxes ticked across your goals.
      </p>
      <div
        className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        aria-label={`${summary.ticked} of ${summary.possible} boxes ticked, ${pct} percent`}
      >
        <div
          className="h-full rounded-full bg-emerald-600 transition-all dark:bg-emerald-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
