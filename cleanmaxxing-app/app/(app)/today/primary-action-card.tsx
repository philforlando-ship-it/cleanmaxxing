// Phase A of the /today redesign — the single primary action surfaced
// at the top of the page. Decreasing-prominence hierarchy starts here:
// THIS card is the loudest thing on /today, everything else is calmer.
//
// Server component. The picker runs server-side; this just renders.

import Link from 'next/link';
import {
  BarbellIcon,
  CalendarCheckIcon,
  CameraIcon,
  CarrotIcon,
  CheckCircleIcon,
  CompassIcon,
  DropIcon,
  HairDryerIcon,
  HeartbeatIcon,
  MoonIcon,
  PillIcon,
  ScalesIcon,
  ScissorsIcon,
  SparkleIcon,
  TShirtIcon,
  UserFocusIcon,
  WarningIcon,
} from '@phosphor-icons/react/ssr';
import type { Icon } from '@phosphor-icons/react';
import type { PrimaryAction, PrimaryActionKind } from '@/lib/today/types';
import { TileIcon, type TileIconTone } from './tile-icon';

type Props = {
  action: PrimaryAction;
};

// Per-kind icon + tone. Action kind drives the visual cue; for
// journey-topic-scoped kinds (pattern_a_overdue / current_stage,
// plan_stale_refresh), we'd ideally pick the journey-specific
// glyph, but a single per-kind default reads cleanly and avoids
// the prop sprawl. Topic-aware overrides happen below the table.
const KIND_ICON: Record<PrimaryActionKind, { icon: Icon; tone: TileIconTone }> =
  {
    stepped_away: { icon: MoonIcon, tone: 'zinc' },
    first_run_assessment: { icon: CompassIcon, tone: 'sky' },
    pattern_d_concerning: { icon: WarningIcon, tone: 'rose' },
    pattern_a_overdue: { icon: CalendarCheckIcon, tone: 'amber' },
    weekly_reflection_due: { icon: CalendarCheckIcon, tone: 'sky' },
    pattern_a_current_stage: { icon: SparkleIcon, tone: 'emerald' },
    pattern_d_check_in: { icon: PillIcon, tone: 'violet' },
    plan_stale_refresh: { icon: CalendarCheckIcon, tone: 'amber' },
    pattern_d_considering: { icon: PillIcon, tone: 'violet' },
    circuit_breaker: { icon: ScalesIcon, tone: 'amber' },
    journey_maintenance: { icon: SparkleIcon, tone: 'emerald' },
    all_quiet: { icon: CheckCircleIcon, tone: 'emerald' },
  };

// Journey-topic glyph used when we know exactly which journey the
// action points at — overrides the kind-level default so a hair
// stage gets Scissors, a strength stage gets Barbell, etc.
const TOPIC_ICON: Partial<Record<NonNullable<PrimaryAction['journey_topic']>, Icon>> =
  {
    hair: ScissorsIcon,
    style: TShirtIcon,
    facial_hair: HairDryerIcon,
    facial_structure: UserFocusIcon,
    nutrition: CarrotIcon,
    strength: BarbellIcon,
    cardio: HeartbeatIcon,
    sleep: MoonIcon,
    skincare: DropIcon,
    glp1: PillIcon,
    trt: PillIcon,
  };

// Photo-cadence overdue tiles should pull the camera glyph regardless
// of journey topic — the action IS "take a photo," not "do your
// strength workout." Currently routed through pattern_a_overdue with
// a CTA containing "photo"; if PrimaryAction grows a dedicated photo
// kind we should swap this out.
function pickIcon(action: PrimaryAction): { icon: Icon; tone: TileIconTone } {
  const base = KIND_ICON[action.kind];
  // Topic-aware refinement for stage-driven kinds.
  if (
    action.journey_topic &&
    (action.kind === 'pattern_a_current_stage' ||
      action.kind === 'pattern_a_overdue' ||
      action.kind === 'plan_stale_refresh' ||
      action.kind === 'pattern_d_check_in' ||
      action.kind === 'pattern_d_considering')
  ) {
    const topicGlyph = TOPIC_ICON[action.journey_topic];
    if (topicGlyph) return { icon: topicGlyph, tone: base.tone };
  }
  // Photo-cadence overdue heuristic: CTA copy is the signal we have.
  if (
    action.kind === 'pattern_a_overdue' &&
    /photo/i.test(action.cta_label)
  ) {
    return { icon: CameraIcon, tone: base.tone };
  }
  return base;
}

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

  const { icon, tone } = pickIcon(action);

  return (
    <section className={containerClass}>
      <div className="flex items-start gap-3">
        <TileIcon icon={icon} tone={tone} size={isQuiet ? 18 : 22} />
        <div className="min-w-0 flex-1">
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
        </div>
      </div>
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
