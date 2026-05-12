// "Coming up" strip on /reflection. Vertical timeline of scheduled
// cadence events over the next 14 days. Server component — pure
// presentation, no interactivity beyond the per-row Link.
//
// Visual logic:
//   - Date column (left) shows a short label ("Today", "Tomorrow",
//     weekday name within 6 days, else "May 24") plus a smaller
//     hint ("3 days").
//   - Vertical rail runs through the middle, with a kind-colored
//     dot on every row.
//   - Title + journey badge + one-line detail on the right.
//   - Whole row is a Link with subtle hover state.
//
// No data fetching here — events are computed server-side in
// lib/cadence/upcoming.ts and passed in.

import Link from 'next/link';
import type { CadenceEvent, CadenceEventKind } from '@/lib/cadence/upcoming';

// Kind-based accent colors. We deliberately don't color by journey
// (8+ journeys = too many colors in one strip); kind gives a tight
// palette of 4.
const KIND_ACCENT: Record<CadenceEventKind, string> = {
  weekly_reflection: 'from-indigo-400 to-indigo-600',
  monthly_checkpoint: 'from-amber-400 to-amber-600',
  facial_structure_photo: 'from-rose-400 to-rose-600',
  facial_structure_stage_3_maintenance: 'from-rose-400 to-rose-600',
  journey_anniversary: 'from-emerald-400 to-emerald-600',
};

function dateLabel(daysFromToday: number, dateIso: string): string {
  if (daysFromToday <= 0) return 'Today';
  if (daysFromToday === 1) return 'Tomorrow';
  const d = new Date(`${dateIso}T00:00:00`);
  if (daysFromToday <= 6) {
    return d.toLocaleDateString('en-US', { weekday: 'long' });
  }
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function dateHint(daysFromToday: number): string {
  if (daysFromToday <= 0) return 'Due now';
  if (daysFromToday === 1) return '1 day';
  return `${daysFromToday} days`;
}

export function UpcomingCadenceStrip({ events }: { events: CadenceEvent[] }) {
  if (events.length === 0) return null;

  return (
    <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-gradient-to-br from-white via-zinc-50 to-white shadow-sm dark:border-zinc-800 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950">
      <header className="flex items-baseline justify-between gap-4 border-b border-zinc-200/70 px-6 py-4 dark:border-zinc-800/70">
        <div>
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
            Coming up
          </h2>
          <p className="mt-1 text-[13px] leading-snug text-zinc-600 dark:text-zinc-400">
            Scheduled cadence over the next 14 days. Daily habits and
            condition-driven prompts don&rsquo;t appear here.
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-zinc-100 px-2.5 py-1 text-[11px] font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
          {events.length}
        </span>
      </header>

      <ol className="relative px-5 pt-4 pb-5">
        {/* Continuous timeline rail. Sits behind the dots; its left
            value must match the dot column's horizontal center
            (px-5 + w-16 + gap-3 + half of w-4 = 104px ≈ 6.5rem). */}
        <span
          aria-hidden
          className="pointer-events-none absolute left-[6.5rem] top-7 bottom-7 w-px bg-gradient-to-b from-transparent via-zinc-200 to-transparent dark:via-zinc-700"
        />

        {events.map((event, idx) => (
          <li
            key={`${event.kind}-${event.date}-${idx}`}
            className="relative"
          >
            <Link
              href={event.href}
              className="group -mx-2 flex items-start gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-white dark:hover:bg-zinc-800/40"
            >
              {/* Date column */}
              <div className="w-16 shrink-0 pt-0.5 text-right">
                <p className="text-[15px] font-semibold leading-tight text-zinc-900 dark:text-zinc-100">
                  {dateLabel(event.daysFromToday, event.date)}
                </p>
                <p className="mt-0.5 text-[11px] font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  {dateHint(event.daysFromToday)}
                </p>
              </div>

              {/* Dot column (dot sits on the rail) */}
              <div className="relative w-4 shrink-0">
                <span
                  aria-hidden
                  className={`absolute left-1/2 top-2 h-3 w-3 -translate-x-1/2 rounded-full bg-gradient-to-br shadow-[0_0_0_4px_rgba(250,250,250,0.95)] dark:shadow-[0_0_0_4px_rgba(9,9,11,0.95)] ${KIND_ACCENT[event.kind]}`}
                />
              </div>

              {/* Content */}
              <div className="min-w-0 flex-1 pt-0.5">
                <div className="flex flex-wrap items-baseline gap-x-2">
                  <h3 className="text-[14px] font-medium text-zinc-900 dark:text-zinc-100">
                    {event.title}
                  </h3>
                  {event.journeyLabel && (
                    <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                      {event.journeyLabel}
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-[13px] leading-snug text-zinc-600 dark:text-zinc-400">
                  {event.detail}
                </p>
              </div>

              {/* Chevron */}
              <span
                aria-hidden
                className="pt-1 text-zinc-300 transition-transform group-hover:translate-x-0.5 group-hover:text-zinc-600 dark:text-zinc-600 dark:group-hover:text-zinc-300"
              >
                →
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
