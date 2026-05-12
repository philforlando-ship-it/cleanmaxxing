'use client';

// Daily SPF log on /today. The single highest-leverage skincare
// action — UV damage compounds and is partially irreversible, so
// it's the only routine step that earns a daily check. The other
// floor pieces (cleanser, moisturizer) and actives are handled on
// /plan/skincare; here we ask one yes/no.
//
// Same compact-after-log behavior as NutritionLogCard — once the
// day is logged, the card collapses to a one-liner with an Edit
// affordance.

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { SunIcon } from '@phosphor-icons/react/ssr';
import { TileIcon } from './tile-icon';
import type { SkincareLogState } from '@/lib/skincare/log-service';
import { appDayFor } from '@/lib/date/app-day';

type Props = {
  state: SkincareLogState;
  timezone: string;
};

export function SkincareSpfCard({ state, timezone }: Props) {
  const router = useRouter();
  const today = appDayFor(timezone);
  const existing = state.today;

  const [editing, setEditing] = useState(existing === null);
  const [applied, setApplied] = useState<boolean | null>(
    existing ? existing.applied_spf : null,
  );
  const [notes, setNotes] = useState<string>(existing?.notes ?? '');
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function save() {
    setError(null);
    if (applied === null) {
      setError('Pick yes or no.');
      return;
    }
    startTransition(async () => {
      try {
        const res = await fetch('/api/skincare/log', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            date: today,
            applied_spf: applied,
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

  if (!editing && existing) {
    const hitText = existing.applied_spf ? 'On' : 'Skipped';
    return (
      <section className="rounded-xl border border-zinc-200 bg-white px-5 py-3 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            <TileIcon icon={SunIcon} tone="amber" compact />
            <span className="font-medium text-zinc-700 dark:text-zinc-300">
              SPF
            </span>
            <span className="text-zinc-900 dark:text-zinc-100">
              <span className="font-semibold">{hitText}</span>
            </span>
            {state.loggedLast7 > 1 && (
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                {state.hitLast7}/{state.loggedLast7} on / last 7
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
      <div className="flex items-start gap-3">
        <TileIcon icon={SunIcon} tone="amber" />
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-medium">SPF on today?</h2>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Mineral or chemical, SPF 30+, before leaving the house. The one
            skincare move that has to fire every day.
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-4">
        <div>
          <div className="flex flex-wrap gap-2">
            {[
              { value: true, label: 'Yes' },
              { value: false, label: 'No' },
            ].map((opt) => {
              const selected = applied === opt.value;
              return (
                <button
                  key={String(opt.value)}
                  type="button"
                  onClick={() => setApplied(opt.value)}
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
            htmlFor="skincare-notes"
            className="block text-xs text-zinc-600 dark:text-zinc-400"
          >
            Notes (optional)
          </label>
          <input
            id="skincare-notes"
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={pending}
            maxLength={500}
            placeholder="Forgot, indoors all day, etc."
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
                setApplied(existing.applied_spf);
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
