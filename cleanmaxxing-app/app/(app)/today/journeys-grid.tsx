// JourneysGrid — surfaces all 8 journeys on /today, regardless of the
// user's focus_areas. focus_areas dictates ordering only (picked
// journeys first, with the Cleanmaxxing pyramid tier breaking ties).
// Sits between the PrimaryActionCard and the existing daily-action
// tiles per the May 2026 redesign.

import Link from 'next/link';
import {
  JOURNEYS,
  STATUS_CTA,
  STATUS_LABEL,
  sortJourneys,
  statusFromAssessment,
  tierForJourney,
  type JourneyConfig,
  type JourneyStatus,
} from '@/lib/today/journeys';
import type { TierKey } from '@/lib/hierarchy/tiers';

// User-visible tier label. Maps the canonical tier-N keys onto the
// "Tier N" copy pattern used in /system and now on /today's grid.
function tierLabelFor(tier: TierKey): string {
  // Defensive: TierKey is a finite union, but the replace-based form
  // makes the relationship between the key and the label obvious.
  return tier.replace('tier-', 'Tier ');
}

type AssessmentRollup = {
  hasAssessment: boolean;
  hasReport: boolean;
};

export type JourneysGridProps = {
  // The user's focus_areas selection from onboarding (post-2026-05-07
  // picker vocabulary OR legacy values; the sorter handles both).
  focusAreas: ReadonlyArray<string>;
  // Per-journey assessment rollup. Already gathered by the primary-
  // action picker upstream; pass through to avoid a duplicate query
  // round-trip.
  assessments: Record<JourneyConfig['slug'], AssessmentRollup>;
  // Age threads through both the sort (cardio's tier flips at 35+)
  // and the displayed tier label on each tile. Null when not on file.
  age: number | null;
};

export function JourneysGrid({
  focusAreas,
  assessments,
  age,
}: JourneysGridProps) {
  const sorted = sortJourneys(focusAreas, age);
  const pickedSlugs = new Set(focusAreas);

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
      <header>
        <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
          Your journeys
        </h2>
        <p className="mt-1.5 text-[13px] leading-relaxed text-zinc-600 dark:text-zinc-400">
          Foundation first. The Focus chip marks what you picked at
          onboarding.
        </p>
      </header>
      <ul className="mt-5 grid gap-3 sm:grid-cols-2">
        {sorted.map((journey) => {
          const rollup = assessments[journey.slug];
          const status = statusFromAssessment(
            rollup?.hasAssessment ?? false,
            rollup?.hasReport ?? false,
          );
          const isPicked = pickedSlugs.has(journey.slug);
          return (
            <JourneyTile
              key={journey.slug}
              journey={journey}
              status={status}
              isPicked={isPicked}
              tier={tierForJourney(journey, age)}
            />
          );
        })}
      </ul>
    </section>
  );
}

function JourneyTile({
  journey,
  status,
  isPicked,
  tier,
}: {
  journey: JourneyConfig;
  status: JourneyStatus;
  isPicked: boolean;
  tier: TierKey;
}) {
  // Picked journeys get a stronger visual treatment (the user's
  // declared priority should read clearly above unpicked ones, even
  // when both are surfaced). Background tone shifts; border keeps
  // the same neutral.
  const bgClass = isPicked
    ? 'bg-zinc-50 dark:bg-zinc-800/60'
    : 'bg-white dark:bg-zinc-900';

  return (
    <li
      className={`rounded-lg border border-zinc-200 ${bgClass} p-4 dark:border-zinc-700`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-[15px] font-medium text-zinc-900 dark:text-zinc-100">
            {journey.label}
          </h3>
          {/* Status line carries the framework tier as a left-anchored
              prefix. Surfaces what /system explains in detail without
              re-cluttering the tile with a separate badge. The tier
              comes from the resolved (age-aware) value, not the static
              JourneyConfig — cardio shows Tier 2 for users 35+ even
              though the config still lists tier-3 as the default. */}
          <p className="mt-1 text-[12px] text-zinc-500 dark:text-zinc-400">
            {tierLabelFor(tier)} · {STATUS_LABEL[status]}
          </p>
        </div>
        {isPicked && (
          <span className="rounded-full border border-zinc-300 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-zinc-700 dark:border-zinc-600 dark:text-zinc-300">
            Focus
          </span>
        )}
      </div>
      {status === 'none' && (
        <p className="mt-2 text-[12px] leading-relaxed text-zinc-500 dark:text-zinc-400">
          {journey.blurb}
        </p>
      )}
      <Link
        href={journey.planPath}
        className="mt-3 inline-flex items-center text-[13px] font-medium text-zinc-900 underline decoration-dotted underline-offset-2 hover:text-zinc-700 dark:text-zinc-100 dark:hover:text-zinc-300"
      >
        {STATUS_CTA[status]} →
      </Link>
    </li>
  );
}
