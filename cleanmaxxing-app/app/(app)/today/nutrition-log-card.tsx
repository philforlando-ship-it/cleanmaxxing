'use client';

// Daily protein-target log on /today. "Today" = the user's app-day
// in their stored IANA timezone (3am-local cutoff via
// lib/date/app-day.ts) so a late-night log routes to the right day.
//
// One-question card: did you hit your protein target today, yes
// or no? Optional grams field for users who actually count.
// Mirrors the sleep card's compact-summary-after-log behavior —
// once logged, collapses to a one-liner with an Edit affordance,
// because a logged value isn't asking for action.
//
// We don't surface a target number. The brand position is that
// the user knows their target (0.8–0.9 g/lb body weight per the
// content) — making us the source of that number turns this into
// a macro tracker, which is a different product.

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { NutritionState } from '@/lib/nutrition/service';
import { appDayFor } from '@/lib/date/app-day';

type Props = {
  state: NutritionState;
  timezone: string;
};

export function NutritionLogCard({ state, timezone }: Props) {
  const router = useRouter();
  const today = appDayFor(timezone);
  const existing = state.today;

  const [editing, setEditing] = useState(existing === null);
  const [hit, setHit] = useState<boolean | null>(
    existing ? existing.hit_target : null,
  );
  const [grams, setGrams] = useState<string>(
    existing?.protein_grams !== null && existing?.protein_grams !== undefined
      ? String(existing.protein_grams)
      : '',
  );
  const [notes, setNotes] = useState<string>(existing?.notes ?? '');
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function save() {
    setError(null);
    if (hit === null) {
      setError('Pick yes or no.');
      return;
    }
    let gramsVal: number | null = null;
    if (grams.trim() !== '') {
      const n = Number(grams);
      if (!Number.isFinite(n) || n < 0 || n > 600) {
        setError('Grams must be between 0 and 600.');
        return;
      }
      gramsVal = Math.round(n);
    }
    startTransition(async () => {
      try {
        const res = await fetch('/api/nutrition', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            date: today,
            hit_target: hit,
            protein_grams: gramsVal,
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

  // Compact one-line render once today is logged. Same pattern as
  // SleepLogCard.
  if (!editing && existing) {
    const hitText = existing.hit_target ? 'Hit' : 'Missed';
    return (
      <section className="rounded-xl border border-zinc-200 bg-white px-5 py-3 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm">
            <span className="font-medium text-zinc-700 dark:text-zinc-300">
              Protein
            </span>
            <span className="text-zinc-900 dark:text-zinc-100">
              <span className="font-semibold">{hitText}</span>
              {existing.protein_grams !== null && (
                <span className="text-zinc-500">
                  {' · '}
                  {existing.protein_grams}g
                </span>
              )}
            </span>
            {state.loggedLast7 > 1 && (
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                {state.hitLast7}/{state.loggedLast7} hit / last 7
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
        <h2 className="text-lg font-medium">Did you hit your protein today?</h2>
      </div>
      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
        Working range is 0.8–0.9 g per pound of body weight. You know your
        number — this is just the felt-sense log.
      </p>

      <div className="mt-4 space-y-4">
        <div>
          <span className="block text-xs text-zinc-600 dark:text-zinc-400">
            Hit your target?
          </span>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {[
              { value: true, label: 'Yes' },
              { value: false, label: 'No' },
            ].map((opt) => {
              const selected = hit === opt.value;
              return (
                <button
                  key={String(opt.value)}
                  type="button"
                  onClick={() => setHit(opt.value)}
                  disabled={pending}
                  className={
                    selected
                      ? 'rounded-full bg-zinc-900 px-4 py-1 text-xs font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900'
                      : 'rounded-full border border-zinc-300 px-4 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800'
                  }
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label
            htmlFor="nutrition-grams"
            className="block text-xs text-zinc-600 dark:text-zinc-400"
          >
            Grams (optional)
          </label>
          <input
            id="nutrition-grams"
            type="number"
            min={0}
            max={600}
            step={1}
            value={grams}
            onChange={(e) => setGrams(e.target.value)}
            disabled={pending}
            placeholder="e.g. 160"
            className="mt-1.5 w-32 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
        </div>

        <div>
          <label
            htmlFor="nutrition-notes"
            className="block text-xs text-zinc-600 dark:text-zinc-400"
          >
            Notes (optional)
          </label>
          <input
            id="nutrition-notes"
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={pending}
            maxLength={500}
            placeholder="What worked, what didn't"
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
                setHit(existing.hit_target);
                setGrams(
                  existing.protein_grams !== null
                    ? String(existing.protein_grams)
                    : '',
                );
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
    </section>
  );
}
