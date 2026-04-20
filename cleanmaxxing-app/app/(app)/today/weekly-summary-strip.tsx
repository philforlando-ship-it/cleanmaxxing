// One-line rolling 7-day check-in total, rendered under the daily
// check-in card. Intentionally quiet: count, not streak; no emojis, no
// celebratory copy. The point is to let the user see their check-ins
// going somewhere without turning them into a score.

import type { WeeklyCheckInSummary } from '@/lib/check-in/service';

type Props = {
  summary: WeeklyCheckInSummary;
};

export function WeeklySummaryStrip({ summary }: Props) {
  if (summary.goalCount === 0 || summary.possible === 0) return null;

  return (
    <p className="px-1 text-xs text-zinc-500 dark:text-zinc-400">
      This week: {summary.ticked}/{summary.possible} boxes ticked across your goals.
    </p>
  );
}
