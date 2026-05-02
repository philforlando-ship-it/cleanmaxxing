'use client';

// Daily sleep log on /today. "Last night" = the app-day immediately
// before today's app-day, computed in the user's stored IANA
// timezone with a 3am-local cutoff (see lib/date/app-day.ts). So a
// 1am check-in still routes the log to yesterday's night_of, not
// tomorrow's blank slate.
//
// When last night isn't logged, shows the form. Once logged, shows
// the captured values with an Edit option. The 7-day rolling
// average sits below as quiet context; no streaks, no scoring.

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { SleepLog } from '@/lib/sleep/service';
import { appDayFor, previousAppDayFor } from '@/lib/date/app-day';

type Props = {
  recent: SleepLog[];
  rollingAvgHours: number | null;
  rollingCount: number;
  timezone: string;
};

const QUALITY_LABELS: Record<number, string> = {
  1: 'Restless',
  2: 'Patchy',
  3: 'OK',
  4: 'Solid',
  5: 'Great',
};

export function SleepLogCard({
  recent,
  rollingAvgHours,
  rollingCount,
  timezone,
}: Props) {
  const router = useRouter();
  const lastNight = previousAppDayFor(timezone);
  const today = appDayFor(timezone);
  const existing = recent.find((r) => r.night_of === lastNight) ?? null;

  const [editing, setEditing] = useState(existing === null);
  const [hours, setHours] = useState<string>(
    existing ? String(existing.hours) : '',
  );
  const [quality, setQuality] = useState<number | null>(
    existing?.quality_1_5 ?? null,
  );
  const [notes, setNotes] = useState<string>(existing?.notes ?? '');
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function save() {
    setError(null);
    const trimmed = hours.trim();
    if (trimmed === '') {
      setError('Enter how many hours.');
      return;
    }
    const n = Number(trimmed);
    if (!Number.isFinite(n) || n < 0 || n > 14) {
      setError('Hours must be between 0 and 14.');
      return;
    }
    startTransition(async () => {
      try {
        const res = await fetch('/api/sleep', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            night_of: lastNight,
            hours: n,
            quality_1_5: quality,
            notes: notes.trim() || null,
          }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? `Save failed (${res.status})`);
        }
        setEditing(false);
        router.refresh();
      } catch (err) {
        setError((err as Error).message);
      }
    });
  }

  // Format last-night's date for the header label, e.g. "Mon Apr 30".
  const headerLabel = (() => {
    const d = new Date(`${lastNight}T12:00:00`);
    return d.toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  })();

  // Compact one-line render when last night is already logged and
  // the user isn't actively editing. The full card collapses
  // because a logged sleep value isn't asking for action — it's
  // reference. Click Edit to expand back to the form.
  if (!editing && existing) {
    return (
      <section className="rounded-xl border border-zinc-200 bg-white px-5 py-3 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm">
            <span className="font-medium text-zinc-700 dark:text-zinc-300">
              Sleep
            </span>
            <span className="text-zinc-900 dark:text-zinc-100">
              <span className="font-semibold">{existing.hours}h</span>
              {existing.quality_1_5 !== null && (
                <span className="text-zinc-500">
                  {' · '}
                  {QUALITY_LABELS[existing.quality_1_5]}
                </span>
              )}
            </span>
            {rollingCount > 1 && rollingAvgHours !== null && (
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                {rollingAvgHours}h avg / {rollingCount} nights
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="text-xs text-zinc-500 underline decoration-dotted underline-offset-2 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
          >
            Edit
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-lg font-medium">Last night&rsquo;s sleep</h2>
        <span className="text-xs text-zinc-500">{headerLabel}</span>
      </div>

      <div className="mt-4 space-y-4">
          <div>
            <label
              htmlFor="sleep-hours"
              className="block text-xs text-zinc-600 dark:text-zinc-400"
            >
              Hours
            </label>
            <input
              id="sleep-hours"
              type="number"
              min={0}
              max={14}
              step={0.5}
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              disabled={pending}
              placeholder="e.g. 7.5"
              className="mt-1.5 w-32 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
          </div>

          <div>
            <span className="block text-xs text-zinc-600 dark:text-zinc-400">
              Quality
            </span>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {[1, 2, 3, 4, 5].map((n) => {
                const selected = quality === n;
                return (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setQuality(selected ? null : n)}
                    disabled={pending}
                    className={
                      selected
                        ? 'rounded-full bg-zinc-900 px-3 py-1 text-xs font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900'
                        : 'rounded-full border border-zinc-300 px-3 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800'
                    }
                  >
                    {n} · {QUALITY_LABELS[n]}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label
              htmlFor="sleep-notes"
              className="block text-xs text-zinc-600 dark:text-zinc-400"
            >
              Notes (optional)
            </label>
            <input
              id="sleep-notes"
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={pending}
              maxLength={500}
              placeholder="What broke it, what helped"
              className="mt-1.5 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          )}

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={save}
              disabled={pending}
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              {pending ? 'Saving…' : existing ? 'Update' : 'Save'}
            </button>
            {existing && (
              <button
                type="button"
                onClick={() => {
                  setEditing(false);
                  setHours(String(existing.hours));
                  setQuality(existing.quality_1_5);
                  setNotes(existing.notes ?? '');
                  setError(null);
                }}
                disabled={pending}
                className="text-xs text-zinc-500 underline dark:text-zinc-400"
              >
                Cancel
              </button>
            )}
          </div>
        </div>

      {rollingCount > 0 && rollingAvgHours !== null && (
        <p className="mt-4 border-t border-zinc-200 pt-3 text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
          {rollingAvgHours}h average over your last {rollingCount} logged{' '}
          {rollingCount === 1 ? 'night' : 'nights'}.
          {today === lastNight ? '' : ''}
        </p>
      )}
    </section>
  );
}
