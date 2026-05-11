// Reusable maintenance / drift view rendered at the top of
// /plan/[topic] pages when journey_states.phase != 'implementing'.
// Pure display of authored content from lib/journey-state/maintenance-content.ts.
//
// Three states drive the framing:
//   maintaining — full four-section view; "the work shifts" intro.
//   drifting    — climb-back section bubbled to the top; drift-signal
//                 section shows in the more urgent register.
//
// No interactivity. Server-renderable. The implementation view that
// lives below this on the page stays untouched — for Slice 2 v1 we
// stack maintenance ABOVE implementation rather than swap. Users can
// scroll down to the implementation view; subsequent slices may add
// a collapsed-by-default treatment.

import type { JourneyPhase } from '@/lib/journey-state/compute';
import type { MaintenanceContent } from '@/lib/journey-state/maintenance-content';

type Props = {
  phase: Extract<JourneyPhase, 'maintaining' | 'drifting'>;
  enteredAt: string;
  content: MaintenanceContent;
};

function formatEnteredAt(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function MaintenanceView({ phase, enteredAt, content }: Props) {
  const isDrifting = phase === 'drifting';
  return (
    <section
      className={
        'rounded-xl border p-6 ' +
        (isDrifting
          ? 'border-amber-300 bg-amber-50 dark:border-amber-700/60 dark:bg-amber-950/30'
          : 'border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900')
      }
    >
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            {isDrifting ? 'Drift detected' : 'Maintenance'}
          </p>
          <h2 className="mt-1 text-lg font-medium text-zinc-900 dark:text-zinc-100">
            {content.headline}
          </h2>
        </div>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          {isDrifting ? 'Signal fired' : 'Maintaining since'}{' '}
          {formatEnteredAt(enteredAt)}
        </p>
      </div>

      {/* Climb-back gets top billing when drifting — the user needs the
          response action first, with the diagnostic below. */}
      {isDrifting ? (
        <>
          <Section
            title="Climb back"
            intro={content.climbBack.intro}
            items={content.climbBack.items}
          />
          <Section
            title="Drift signals worth catching early"
            intro={content.driftSignals.intro}
            items={content.driftSignals.items}
          />
          <Section
            title="What the floor looks like"
            intro={content.defendedFloor.intro}
            items={content.defendedFloor.items}
          />
        </>
      ) : (
        <>
          <Section
            title="The defended floor"
            intro={content.defendedFloor.intro}
            items={content.defendedFloor.items}
          />
          <Section
            title="Drift signals worth catching early"
            intro={content.driftSignals.intro}
            items={content.driftSignals.items}
          />
          <Section
            title="Climb-back protocol"
            intro={content.climbBack.intro}
            items={content.climbBack.items}
          />
        </>
      )}

      <div className="mt-6 border-t border-zinc-200 pt-4 dark:border-zinc-800">
        <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
          Recalibration cadence
        </p>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          {content.cadence.intro}
        </p>
        <dl className="mt-3 space-y-2 text-sm">
          {content.cadence.items.map((item) => (
            <div
              key={`${item.frequency}-${item.action}`}
              className="flex flex-col gap-1 sm:flex-row sm:gap-3"
            >
              <dt className="font-medium text-zinc-700 dark:text-zinc-300 sm:w-32 sm:shrink-0">
                {item.frequency}
              </dt>
              <dd className="text-zinc-600 dark:text-zinc-400">
                {item.action}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

function Section({
  title,
  intro,
  items,
}: {
  title: string;
  intro: string;
  items: string[];
}) {
  return (
    <div className="mt-5">
      <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
        {title}
      </p>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{intro}</p>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-zinc-700 dark:text-zinc-300">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
