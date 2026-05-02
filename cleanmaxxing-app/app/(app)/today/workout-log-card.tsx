'use client';

// Quick workout log on /today. "Today" = the user's app-day in
// their stored IANA timezone (3am-local cutoff via
// lib/date/app-day.ts) so a late-night log routes to the right day
// no matter where they're physically located.
//
// Compact when nothing's logged today (CTA only); expands to a
// form on click; collapses to a summary line once the user has
// logged at least one session for today (multiple are allowed).
// Multiple sessions in a day stack as comma-separated summaries —
// most users won't log twice but lifting + cardio in the same day
// is the obvious case.

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { WorkoutLog, WorkoutType } from '@/lib/workout/service';
import { appDayFor } from '@/lib/date/app-day';

type Props = {
  recent: WorkoutLog[];
  timezone: string;
};

const TYPE_LABEL: Record<WorkoutType, string> = {
  strength: 'Strength',
  cardio: 'Cardio',
  mobility: 'Mobility',
  other: 'Other',
};

const TYPES: WorkoutType[] = ['strength', 'cardio', 'mobility', 'other'];

type LiftDraft = {
  name: string;
  sets: string;
  reps: string;
  weight: string;
};

const EMPTY_LIFT: LiftDraft = { name: '', sets: '', reps: '', weight: '' };

export function WorkoutLogCard({ recent, timezone }: Props) {
  const router = useRouter();
  const today = appDayFor(timezone);
  const todaysLogs = useMemo(
    () => recent.filter((r) => r.performed_on === today),
    [recent, today],
  );

  const [editing, setEditing] = useState(false);
  const [type, setType] = useState<WorkoutType>('strength');
  const [duration, setDuration] = useState('');
  const [notes, setNotes] = useState('');
  const [lifts, setLifts] = useState<LiftDraft[]>([{ ...EMPTY_LIFT }]);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setType('strength');
    setDuration('');
    setNotes('');
    setLifts([{ ...EMPTY_LIFT }]);
    setError(null);
  }

  function updateLift(i: number, patch: Partial<LiftDraft>) {
    setLifts((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  }

  function addLift() {
    setLifts((prev) => [...prev, { ...EMPTY_LIFT }]);
  }

  function removeLift(i: number) {
    setLifts((prev) => prev.filter((_, idx) => idx !== i));
  }

  function submit() {
    setError(null);
    let durationVal: number | null = null;
    if (duration.trim() !== '') {
      const n = Number(duration);
      if (!Number.isFinite(n) || n < 0 || n > 480) {
        setError('Duration must be between 0 and 480 minutes.');
        return;
      }
      durationVal = Math.round(n);
    }

    // Lifts only ride along when the type is strength. Empty
    // rows (name blank) are dropped silently — common case is
    // the user opened the lift table, didn't fill it in, and
    // doesn't want validation noise.
    const liftPayload =
      type === 'strength'
        ? lifts
            .filter((l) => l.name.trim() !== '')
            .map((l) => ({
              name: l.name.trim().slice(0, 100),
              sets: l.sets.trim() ? Math.round(Number(l.sets)) : null,
              reps: l.reps.trim() ? Math.round(Number(l.reps)) : null,
              weight_lbs: l.weight.trim() ? Number(l.weight) : null,
            }))
            .filter((l) =>
              [l.sets, l.reps, l.weight_lbs].every(
                (v) => v === null || (typeof v === 'number' && Number.isFinite(v)),
              ),
            )
        : [];

    startTransition(async () => {
      try {
        const res = await fetch('/api/workouts', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            performed_on: today,
            type,
            duration_min: durationVal,
            notes: notes.trim() || null,
            lifts: liftPayload,
          }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? `Save failed (${res.status})`);
        }
        reset();
        setEditing(false);
        router.refresh();
      } catch (err) {
        setError((err as Error).message);
      }
    });
  }

  // Compact summary state — at least one workout logged today,
  // not currently editing. Shows the totals + an inline "Log
  // another" so users with two-a-day cadence aren't blocked.
  if (!editing && todaysLogs.length > 0) {
    return (
      <section className="rounded-xl border border-zinc-200 bg-white px-5 py-3 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm">
            <span className="font-medium text-zinc-700 dark:text-zinc-300">
              Workout
            </span>
            {todaysLogs.map((w, i) => (
              <span key={w.id} className="text-zinc-900 dark:text-zinc-100">
                <span className="font-semibold">{TYPE_LABEL[w.type]}</span>
                {w.duration_min !== null && (
                  <span className="text-zinc-500"> · {w.duration_min} min</span>
                )}
                {i < todaysLogs.length - 1 && (
                  <span className="text-zinc-400">,</span>
                )}
              </span>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="text-xs text-zinc-500 underline decoration-dotted underline-offset-2 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
          >
            Log another
          </button>
        </div>
      </section>
    );
  }

  // Compact CTA state — no log today, not editing.
  if (!editing) {
    return (
      <section className="rounded-xl border border-zinc-200 bg-white px-5 py-3 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4">
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Workout
          </span>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="text-xs text-zinc-500 underline decoration-dotted underline-offset-2 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
          >
            Log a session
          </button>
        </div>
      </section>
    );
  }

  // Expanded form state.
  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-lg font-medium">
          {todaysLogs.length > 0 ? 'Log another' : 'Today’s workout'}
        </h2>
        <button
          type="button"
          onClick={() => {
            reset();
            setEditing(false);
          }}
          disabled={pending}
          className="text-xs text-zinc-500 underline dark:text-zinc-400"
        >
          Cancel
        </button>
      </div>

      <div className="mt-4 space-y-4">
        <div>
          <span className="block text-xs text-zinc-600 dark:text-zinc-400">
            Type
          </span>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {TYPES.map((t) => {
              const selected = type === t;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  disabled={pending}
                  className={
                    selected
                      ? 'rounded-full bg-zinc-900 px-3 py-1 text-xs font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900'
                      : 'rounded-full border border-zinc-300 px-3 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800'
                  }
                >
                  {TYPE_LABEL[t]}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label
            htmlFor="workout-duration"
            className="block text-xs text-zinc-600 dark:text-zinc-400"
          >
            Duration (minutes)
          </label>
          <input
            id="workout-duration"
            type="number"
            min={0}
            max={480}
            step={5}
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            disabled={pending}
            placeholder="e.g. 45"
            className="mt-1.5 w-32 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
        </div>

        {type === 'strength' && (
          <div>
            <span className="block text-xs text-zinc-600 dark:text-zinc-400">
              Lifts (optional)
            </span>
            <p className="mt-0.5 text-[11px] text-zinc-500">
              Leave any field blank if you don&rsquo;t want to log it. Empty
              rows are dropped.
            </p>
            <div className="mt-2 space-y-2">
              {lifts.map((lift, i) => (
                <div
                  key={i}
                  className="grid grid-cols-12 gap-2 text-sm"
                >
                  <input
                    type="text"
                    value={lift.name}
                    onChange={(e) => updateLift(i, { name: e.target.value })}
                    disabled={pending}
                    placeholder="Lift name"
                    maxLength={100}
                    className="col-span-5 rounded-md border border-zinc-300 bg-white px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900"
                  />
                  <input
                    type="number"
                    value={lift.sets}
                    onChange={(e) => updateLift(i, { sets: e.target.value })}
                    disabled={pending}
                    placeholder="Sets"
                    min={0}
                    max={50}
                    className="col-span-2 rounded-md border border-zinc-300 bg-white px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900"
                  />
                  <input
                    type="number"
                    value={lift.reps}
                    onChange={(e) => updateLift(i, { reps: e.target.value })}
                    disabled={pending}
                    placeholder="Reps"
                    min={0}
                    max={1000}
                    className="col-span-2 rounded-md border border-zinc-300 bg-white px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900"
                  />
                  <input
                    type="number"
                    value={lift.weight}
                    onChange={(e) => updateLift(i, { weight: e.target.value })}
                    disabled={pending}
                    placeholder="Lbs"
                    min={0}
                    max={2000}
                    step={2.5}
                    className="col-span-2 rounded-md border border-zinc-300 bg-white px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900"
                  />
                  <button
                    type="button"
                    onClick={() => removeLift(i)}
                    disabled={pending || lifts.length === 1}
                    className="col-span-1 text-xs text-zinc-500 disabled:opacity-30"
                    aria-label="Remove lift"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addLift}
              disabled={pending || lifts.length >= 20}
              className="mt-2 text-xs text-zinc-500 underline decoration-dotted underline-offset-2 hover:text-zinc-700 disabled:opacity-50 dark:text-zinc-400 dark:hover:text-zinc-200"
            >
              + Add lift
            </button>
          </div>
        )}

        <div>
          <label
            htmlFor="workout-notes"
            className="block text-xs text-zinc-600 dark:text-zinc-400"
          >
            Notes (optional)
          </label>
          <input
            id="workout-notes"
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={pending}
            maxLength={500}
            placeholder="How it felt, what worked, what didn't"
            className="mt-1.5 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
        </div>

        {error && (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        )}

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={submit}
            disabled={pending}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            {pending ? 'Saving…' : 'Save workout'}
          </button>
        </div>
      </div>
    </section>
  );
}
