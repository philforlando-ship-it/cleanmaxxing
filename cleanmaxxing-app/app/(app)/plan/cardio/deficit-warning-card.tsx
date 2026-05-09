// Cross-journey energy + fatigue architecture, slice 2 (2026-05-08).
// See memory: project_cross_journey_energy_fatigue_architecture.md.
//
// Surfaces when:
//   - User has an active cardio prescription (days_per_week >= 1_2_days)
//   - User's nutrition plan has goal_direction = 'lose_fat'
//
// Reason: cardio adds calories of burn on top of an existing deficit.
// We don't auto-recalculate the deficit — the warning makes the
// dependency visible so the user can adjust nutrition or expect
// different fatigue and recalibrate from how they actually feel.

import Link from 'next/link';
import type { CardioDaysPerWeek } from '@/lib/cardio/types';
import type { GoalDirection } from '@/lib/nutrition/types';

type Props = {
  daysPerWeek: CardioDaysPerWeek;
  goalDirection: GoalDirection;
};

export function CardioDeficitWarningCard({
  daysPerWeek,
  goalDirection,
}: Props) {
  if (daysPerWeek === '0_days') return null;
  if (goalDirection !== 'lose_fat') return null;

  return (
    <aside className="mt-8 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 dark:border-amber-900/60 dark:bg-amber-950/40">
      <h2 className="text-sm font-semibold text-amber-900 dark:text-amber-200">
        Heads up — cardio on top of a cut
      </h2>
      <p className="mt-2 text-[14px] leading-relaxed text-amber-900 dark:text-amber-100">
        Your cardio prescription will add roughly{' '}
        <strong className="font-semibold">{burnRangeFor(daysPerWeek)}</strong>{' '}
        extra calories of weekly burn on top of the deficit your nutrition
        plan is already running.
      </p>
      <p className="mt-2 text-[14px] leading-relaxed text-amber-900 dark:text-amber-100">
        Cardio is supposed to support the deficit — but the deficit is now
        deeper than your nutrition plan was tuned for. Either revisit
        nutrition with the new activity layer, or hold steady and let how
        you actually feel (energy, training quality, hunger) drive the
        next adjustment.
      </p>
      <div className="mt-3">
        <Link
          href="/plan/nutrition?edit=1"
          className="text-[13px] font-medium text-amber-900 underline decoration-dotted underline-offset-4 hover:text-amber-700 dark:text-amber-200 dark:hover:text-amber-100"
        >
          Revisit your nutrition plan →
        </Link>
      </div>
    </aside>
  );
}

function burnRangeFor(days: CardioDaysPerWeek): string {
  switch (days) {
    case '1_2_days':
      return '200–400';
    case '3_4_days':
      return '600–1,000';
    case '5_plus_days':
      return '1,000–1,500';
    case '0_days':
      return '0';
  }
}
