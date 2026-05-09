'use client';

// Stage 5 card on /plan/hair. Five states:
//   1. locked              → Stage 4 not complete
//   2. not started         → "Start photo monitoring" CTA + protocol preview
//   3. started, no sessions → show protocol + "I've taken my baseline photos"
//   4. started, sessions, not due → summary + log button (always available)
//   5. started, due/overdue → same as 4 with "due now" / "overdue" callout
//
// Stage 5 is perpetual — there's no completion state. Stage 6 unlocks
// when Stage 5 is started, regardless of session count.

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  STAGE_5_INTRO,
  STAGE_5_PANIC_TIMELINE_REMINDER,
  STAGE_5_PROTOCOL_BALD,
  STAGE_5_PROTOCOL_HAIR,
  daysUntilNext,
  nextDueDate,
} from '@/lib/hair/stage-5-content';
import type { CutFamily, Stage2Path } from '@/lib/hair/types';

type Props = {
  stage4Complete: boolean;
  // Stage 4 progress state — used by the locked-state branch to
  // render a "X of 14 logs OR Y of 14 calendar days" countdown
  // (loosened gate as of 2026-05-08). Null when no Stage 4 row
  // exists yet (user hasn't started the routine).
  stage4Count: number | null;
  stage4Target: number | null;
  stage4StartedAt: string | null;
  startedAt: string | null;
  cadenceDays: number | null;
  lastSessionAt: string | null;
  sessionCount: number;
  cutFamily: CutFamily | null;
  stage2Path: Stage2Path | null;
};

// Calendar gate constant — mirrors STAGE_5_CALENDAR_DAYS in
// lib/hair/service.ts. If you change one, change the other.
const STAGE_5_CALENDAR_DAYS = 14;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function HairStage5Card({
  stage4Complete,
  stage4Count,
  stage4Target,
  stage4StartedAt,
  startedAt,
  cadenceDays,
  lastSessionAt,
  sessionCount,
  cutFamily,
  stage2Path,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const isStarted = startedAt !== null && cadenceDays !== null;
  const isBaldTrack =
    cutFamily === 'bald_track' ||
    cutFamily === 'clean_shave' ||
    stage2Path === 'transition';
  const protocol = isBaldTrack
    ? STAGE_5_PROTOCOL_BALD
    : STAGE_5_PROTOCOL_HAIR;

  function start() {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch('/api/plan/hair/stage-5/start', {
          method: 'POST',
        });
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as {
            error?: string;
          };
          throw new Error(body.error ?? `Request failed (${res.status})`);
        }
        router.refresh();
      } catch (err) {
        setError((err as Error).message);
      }
    });
  }

  function logSession() {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch('/api/plan/hair/stage-5/log-session', {
          method: 'POST',
        });
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as {
            error?: string;
          };
          throw new Error(body.error ?? `Request failed (${res.status})`);
        }
        router.refresh();
      } catch (err) {
        setError((err as Error).message);
      }
    });
  }

  // State 1 — locked. Show progress against BOTH unlock paths:
  //   (a) count gate — Stage 4's target of N logged check-ins
  //   (b) calendar gate (loosened 2026-05-08) — 14 calendar days
  //       since stage_4_started_at, with at least 1 logged routine
  // Whichever fires first unlocks Stage 5. Both bars render when
  // stage_4_started_at is set; if Stage 4 hasn't started, we just
  // show the unlock criteria as plain text.
  if (!stage4Complete) {
    // No Stage 4 row at all — bare locked tile.
    if (!stage4StartedAt) {
      return (
        <section className="mt-6 rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-5 py-4 dark:border-zinc-700 dark:bg-zinc-900/50">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-sm">
            <span className="font-medium text-zinc-700 dark:text-zinc-300">
              Stage 5 — Photo monitoring
            </span>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              Unlocks once you start Stage 4
            </span>
          </div>
        </section>
      );
    }

    // Stage 4 in progress — render dual progress bars.
    const elapsedMs = Date.now() - new Date(stage4StartedAt).getTime();
    const elapsedDays = Math.max(0, Math.floor(elapsedMs / MS_PER_DAY));
    const calendarPct = Math.min(
      100,
      Math.round((elapsedDays / STAGE_5_CALENDAR_DAYS) * 100),
    );
    const calendarRemaining = Math.max(
      0,
      STAGE_5_CALENDAR_DAYS - elapsedDays,
    );

    const count = stage4Count ?? 0;
    const target = stage4Target ?? 14;
    const countPct = Math.min(100, Math.round((count / target) * 100));
    const countRemaining = Math.max(0, target - count);

    // Which gate is closer? The calendar gate also requires ≥1 log,
    // so a user with 0 logs is gated on the count side until they
    // log at least once. Reflect that in the framing.
    const calendarGateActive = count >= 1;
    const closerGate: 'count' | 'calendar' =
      calendarGateActive && calendarRemaining < countRemaining
        ? 'calendar'
        : 'count';

    return (
      <section className="mt-6 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h2 className="text-base font-medium text-zinc-900 dark:text-zinc-100">
            Stage 5 — Photo monitoring
          </h2>
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            Unlocks at {target} logs OR {STAGE_5_CALENDAR_DAYS} days + ≥1 log
          </span>
        </div>

        <div className="mt-4 space-y-3">
          {/* Count gate */}
          <div>
            <div className="flex items-baseline justify-between text-[12px]">
              <span className="text-zinc-700 dark:text-zinc-300">
                Daily routine logs
              </span>
              <span className="tabular-nums text-zinc-500 dark:text-zinc-400">
                {count} / {target}
              </span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
              <div
                className="h-full bg-zinc-900 dark:bg-zinc-100"
                style={{ width: `${countPct}%` }}
              />
            </div>
          </div>

          {/* Calendar gate */}
          <div>
            <div className="flex items-baseline justify-between text-[12px]">
              <span className="text-zinc-700 dark:text-zinc-300">
                Days since starting{calendarGateActive ? '' : ' (needs ≥1 log)'}
              </span>
              <span className="tabular-nums text-zinc-500 dark:text-zinc-400">
                {Math.min(elapsedDays, STAGE_5_CALENDAR_DAYS)} /{' '}
                {STAGE_5_CALENDAR_DAYS}
              </span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
              <div
                className={
                  calendarGateActive
                    ? 'h-full bg-zinc-900 dark:bg-zinc-100'
                    : 'h-full bg-zinc-400 dark:bg-zinc-600'
                }
                style={{ width: `${calendarPct}%` }}
              />
            </div>
          </div>
        </div>

        <p className="mt-4 text-[12px] leading-relaxed text-zinc-500 dark:text-zinc-400">
          {closerGate === 'calendar'
            ? `Calendar path unlocks first — ${calendarRemaining} ${calendarRemaining === 1 ? 'day' : 'days'} to go.`
            : count === 0
              ? `Log Stage 4 at least once to activate the calendar path. Otherwise, the count gate unlocks at ${target} logs.`
              : `Count path unlocks first — ${countRemaining} more ${countRemaining === 1 ? 'log' : 'logs'} to go.`}
        </p>
      </section>
    );
  }

  // State 2 — not started.
  if (!isStarted) {
    return (
      <section className="mt-6 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
          Stage 5 — Photo monitoring
        </h2>
        <p className="mt-3 text-[14px] leading-relaxed text-zinc-700 dark:text-zinc-300">
          {STAGE_5_INTRO}
        </p>
        <p className="mt-3 text-[13px] leading-relaxed text-zinc-600 dark:text-zinc-400">
          We don’t store your photos. You take them with your phone, keep them
          in your own library, and run the comparison yourself. We track the
          cadence and remind you when it’s time.
        </p>
        {error && (
          <p className="mt-4 text-sm text-red-600 dark:text-red-400">{error}</p>
        )}
        <div className="mt-4">
          <button
            type="button"
            onClick={start}
            disabled={pending}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            {pending ? 'Starting…' : 'Start photo monitoring'}
          </button>
        </div>
      </section>
    );
  }

  // States 3–5 — started.
  const daysUntil = daysUntilNext(lastSessionAt, cadenceDays!);
  const isFirstSession = sessionCount === 0;
  const isDue = isFirstSession || (daysUntil !== null && daysUntil <= 0);
  const isOverdue = daysUntil !== null && daysUntil < 0;
  const next = nextDueDate(lastSessionAt, cadenceDays!);

  return (
    <section className="mt-6 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
          Stage 5 — Photo monitoring
        </h2>
        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          {sessionCount} session{sessionCount === 1 ? '' : 's'} ·{' '}
          {cadenceDays} day cadence
        </span>
      </div>

      {/* Status line */}
      <div className="mt-3">
        {isFirstSession && (
          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
            Take your baseline photos.
          </p>
        )}
        {!isFirstSession && isOverdue && (
          <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
            Overdue by {Math.abs(daysUntil!)}{' '}
            {Math.abs(daysUntil!) === 1 ? 'day' : 'days'}.
          </p>
        )}
        {!isFirstSession && !isOverdue && isDue && (
          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
            Photo session due today.
          </p>
        )}
        {!isFirstSession && !isDue && next && (
          <p className="text-sm text-zinc-700 dark:text-zinc-300">
            Last session{' '}
            {new Date(lastSessionAt!).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
            })}
            . Next due{' '}
            {next.toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
            })}{' '}
            ({daysUntil} {daysUntil === 1 ? 'day' : 'days'} from now).
          </p>
        )}
      </div>

      {/* Protocol */}
      <div className="mt-6 space-y-5">
        <div>
          <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
            The protocol
          </h3>
          {protocol.map((item) => (
            <div key={item.heading} className="mt-3">
              <p className="text-[13px] font-semibold text-zinc-900 dark:text-zinc-100">
                {item.heading}
              </p>
              <p className="mt-1 text-[14px] leading-relaxed text-zinc-700 dark:text-zinc-300">
                {item.body}
              </p>
            </div>
          ))}
        </div>

        {!isBaldTrack && (
          <div className="rounded-md border border-zinc-200 bg-zinc-50 px-4 py-3 text-[13px] leading-relaxed text-zinc-700 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300">
            <strong className="font-semibold text-zinc-900 dark:text-zinc-100">
              Panic timeline reminder:
            </strong>{' '}
            {STAGE_5_PANIC_TIMELINE_REMINDER}
          </div>
        )}
      </div>

      {error && (
        <p className="mt-4 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={logSession}
          disabled={pending}
          className={
            isDue
              ? 'rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200'
              : 'rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-800'
          }
        >
          {pending
            ? 'Logging…'
            : isFirstSession
              ? 'I’ve taken my baseline photos'
              : 'I’ve taken this session’s photos'}
        </button>
        <Link
          href="/plan/hair/photos"
          className="text-xs text-zinc-500 underline decoration-dotted underline-offset-2 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
        >
          Or upload photos here →
        </Link>
      </div>
    </section>
  );
}
