// JourneysGrid — surfaces all 8 journeys on /today, regardless of the
// user's focus_areas. focus_areas dictates ordering only (picked
// journeys first, with the Cleanmaxxing pyramid tier breaking ties).
// Sits between the PrimaryActionCard and the existing daily-action
// tiles per the May 2026 redesign.

import Link from 'next/link';
import {
  BarbellIcon,
  CarrotIcon,
  DropIcon,
  HairDryerIcon,
  HeartbeatIcon,
  MicrophoneIcon,
  MoonIcon,
  ScissorsIcon,
  StarIcon,
  TShirtIcon,
  UserFocusIcon,
} from '@phosphor-icons/react/ssr';
import type { Icon } from '@phosphor-icons/react';
import {
  STATUS_CTA,
  STATUS_LABEL,
  sortJourneys,
  statusFromAssessment,
  tierForJourney,
  type JourneyConfig,
  type JourneySlug,
  type JourneyStatus,
} from '@/lib/today/journeys';
import type { TierKey } from '@/lib/hierarchy/tiers';

// Per-slug icon mapping. Phosphor Duotone — the two-tone treatment
// gives the grid a more designed visual identity than monoline icons,
// and each pick is intentionally literal so users can skim:
//   hair             → Scissors
//   style            → TShirt (garment, not just apparel-as-abstraction)
//   body_composition → Carrot (nutrition anchor, distinct from Barbell)
//   strength         → Barbell (lifting)
//   cardio           → Heartbeat (cardiovascular signal)
//   sleep            → Moon
//   skincare         → Drop (serum / hydration)
//   facial_hair      → Hairdryer (grooming-tools cluster)
//   facial_structure → UserFocus (face being framed — on-the-nose for the journey)
//   presentation     → Microphone (voice / public-facing presence)
//
// SSR import path matters: `@phosphor-icons/react/dist/ssr` exports
// server-renderable variants so these icons work inside server
// components without a "use client" boundary.
const JOURNEY_ICONS: Record<JourneySlug, Icon> = {
  hair: ScissorsIcon,
  style: TShirtIcon,
  body_composition: CarrotIcon,
  strength: BarbellIcon,
  cardio: HeartbeatIcon,
  sleep: MoonIcon,
  skincare: DropIcon,
  facial_hair: HairDryerIcon,
  facial_structure: UserFocusIcon,
  presentation: MicrophoneIcon,
};

// Per-tier icon accent color. Tier 1 (foundation) gets a calm blue,
// Tier 2 (body) gets emerald, Tier 3 (aesthetic) gets amber, Tier
// 4/5 (presence + finishing) get violet + rose. Subtle — the duotone
// fill picks up the tint, but everything else (text, borders) stays
// neutral so picked / unpicked distinction still reads.
const TIER_ACCENT: Record<TierKey, { bg: string; icon: string }> = {
  'tier-1': {
    bg: 'bg-sky-100 dark:bg-sky-950/40',
    icon: 'text-sky-700 dark:text-sky-300',
  },
  'tier-2': {
    bg: 'bg-emerald-100 dark:bg-emerald-950/40',
    icon: 'text-emerald-700 dark:text-emerald-300',
  },
  'tier-3': {
    bg: 'bg-amber-100 dark:bg-amber-950/40',
    icon: 'text-amber-700 dark:text-amber-300',
  },
  'tier-4': {
    bg: 'bg-violet-100 dark:bg-violet-950/40',
    icon: 'text-violet-700 dark:text-violet-300',
  },
  'tier-5': {
    bg: 'bg-rose-100 dark:bg-rose-950/40',
    icon: 'text-rose-700 dark:text-rose-300',
  },
};

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

  // Partition into foundation (tier-1) and everything beyond. The sort
  // order coming in is "picked-first, tier-asc" so each group keeps
  // its picked-first ordering after the partition. Foundation reads
  // as the non-negotiables — every user benefits, no matter what
  // they picked. Tier 2+ is where personal priority shapes what
  // actually matters most.
  const foundation = sorted.filter(
    (j) => tierForJourney(j, age) === 'tier-1',
  );
  const beyond = sorted.filter((j) => tierForJourney(j, age) !== 'tier-1');

  return (
    // The wrapping <section> + page-level header give the journeys
    // area its own visual identity on /today. Without it, the two
    // tier boxes (Foundation / Beyond foundation) sat directly under
    // the daily-log disclosure with only `space-y-6` separating them,
    // and the two regions read as part of the same logging stack.
    // Now Logs are clearly "today's inputs," Journeys are clearly
    // "the longer-arc tracks." Extra top margin reinforces the break.
    <section aria-labelledby="journeys-heading" className="mt-4">
      <header className="mb-5 border-t border-zinc-200 pt-6 dark:border-zinc-800">
        <h2
          id="journeys-heading"
          className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100"
        >
          Your journeys
        </h2>
        <p className="mt-1.5 text-[13px] leading-relaxed text-zinc-600 dark:text-zinc-400">
          The longer-arc work — assessments, plans, and per-journey
          progress. Foundation first; the rest is shaped by what you
          picked.
        </p>
      </header>
      <div className="space-y-6">
        <JourneyGroup
          title="Foundation"
          tagline="Tier 1. Non-negotiable for everyone — the floor that lets the rest of the work compound."
          journeys={foundation}
          assessments={assessments}
          pickedSlugs={pickedSlugs}
          age={age}
        />
        <JourneyGroup
          title="Beyond foundation"
          tagline="Tier 2+. Where personal priority shapes the order. A star marks what you picked at onboarding."
          journeys={beyond}
          assessments={assessments}
          pickedSlugs={pickedSlugs}
          age={age}
        />
      </div>
    </section>
  );
}

function JourneyGroup({
  title,
  tagline,
  journeys,
  assessments,
  pickedSlugs,
  age,
}: {
  title: string;
  tagline: string;
  journeys: ReadonlyArray<JourneyConfig>;
  assessments: Record<JourneyConfig['slug'], AssessmentRollup>;
  pickedSlugs: Set<string>;
  age: number | null;
}) {
  if (journeys.length === 0) return null;
  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
      <header>
        <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
          {title}
        </h2>
        <p className="mt-1.5 text-[13px] leading-relaxed text-zinc-600 dark:text-zinc-400">
          {tagline}
        </p>
      </header>
      <ul className="mt-5 grid gap-3 sm:grid-cols-2">
        {journeys.map((journey) => {
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
  // Picked journeys get the strong card treatment: 2px dark border,
  // shadow for elevation, brighter resting background. Unpicked stays
  // calm so the picked set obviously reads as "yours" without
  // needing the chip. Hover shifts background one step warmer on
  // both. `Link` wraps the whole tile so the entire box is the
  // click target.
  const tileClass = isPicked
    ? 'block rounded-lg border-2 border-zinc-900 bg-white p-4 shadow-md transition-colors hover:bg-zinc-50 dark:border-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-800/60'
    : 'block rounded-lg border border-zinc-200 bg-white p-4 transition-colors hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700 dark:hover:bg-zinc-800/60';
  const Icon = JOURNEY_ICONS[journey.slug];
  const accent = TIER_ACCENT[tier];

  return (
    <li className="contents">
      <Link href={journey.planPath} className={tileClass}>
        <div className="flex min-w-0 items-start gap-3">
          {/* Per-journey icon. Phosphor duotone — the two-tone fill
              picks up a tier-accent color (sky / emerald / amber) so
              the grid reads as "foundation / body / aesthetic" at a
              glance without a separate badge. */}
          <span
            aria-hidden="true"
            className={`mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${accent.bg} ${accent.icon}`}
          >
            <Icon size={22} weight="duotone" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <h3
                className={
                  isPicked
                    ? 'text-[15px] font-semibold text-zinc-900 dark:text-zinc-100'
                    : 'text-[15px] font-medium text-zinc-900 dark:text-zinc-100'
                }
              >
                {journey.label}
              </h3>
              {/* Focus marker — replaces the old "Focus" chip with a
                  filled star. Reads at a glance, takes no horizontal
                  real estate, and pairs visually with the heavier
                  border + shadow on the tile itself. */}
              {isPicked && (
                <StarIcon
                  size={14}
                  weight="fill"
                  aria-label="Focus journey"
                  className="text-amber-500 dark:text-amber-400"
                />
              )}
            </div>
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
        </div>
        {status === 'none' && (
          <p className="mt-2 text-[12px] leading-relaxed text-zinc-500 dark:text-zinc-400">
            {journey.blurb}
          </p>
        )}
        <span className="mt-3 inline-flex items-center text-[13px] font-medium text-zinc-900 underline decoration-dotted underline-offset-2 dark:text-zinc-100">
          {STATUS_CTA[status]} →
        </span>
      </Link>
    </li>
  );
}
