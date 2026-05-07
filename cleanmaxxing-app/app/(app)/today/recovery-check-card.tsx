'use client';

// Morning-after recovery check tile. Surfaces on /today when the user
// has a strength workout from yesterday AND no feedback row has been
// written for it yet. Server-side gating in /today/page.tsx; this
// component renders the form and POSTs to /api/strength/recovery-check.
//
// v0 design choices:
//   - Show all 8 muscle groups, not just the ones inferred from the
//     prior session's lifts. Inference would require fuzzy
//     name-matching against the catalog; default-fresh keeps the
//     interaction one click per sore muscle.
//   - Energy + joint-pain are optional — saving with only soreness is
//     valid. Lower friction wins; the autoregulation rules degrade
//     gracefully when fields are null.

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

type MuscleGroup =
  | 'chest'
  | 'back'
  | 'shoulders'
  | 'arms'
  | 'legs'
  | 'glutes'
  | 'core'
  | 'calves';

const MUSCLES: { slug: MuscleGroup; label: string }[] = [
  { slug: 'chest', label: 'Chest' },
  { slug: 'back', label: 'Back' },
  { slug: 'shoulders', label: 'Shoulders' },
  { slug: 'arms', label: 'Arms' },
  { slug: 'legs', label: 'Legs' },
  { slug: 'glutes', label: 'Glutes' },
  { slug: 'core', label: 'Core' },
  { slug: 'calves', label: 'Calves' },
];

const SORENESS_LABELS = ['Fresh', 'Fine', 'Sore'] as const;

type Props = {
  workoutLogId: string;
  recordedOn: string;
  yesterdayLabel: string; // e.g. "Yesterday" or "Sun"
  liftSummary: string | null; // optional context line
};

export function RecoveryCheckCard({
  workoutLogId,
  recordedOn,
  yesterdayLabel,
  liftSummary,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  // soreness is sparse — only muscles the user marked are stored.
  // Default UI shows every muscle as "fresh" but writes nothing for
  // unmarked muscles, so the autoregulation summary doesn't conflate
  // "user said fresh" with "user didn't bother."
  const [soreness, setSoreness] = useState<Partial<Record<MuscleGroup, 1 | 2 | 3>>>(
    {},
  );
  const [jointPain, setJointPain] = useState<boolean | null>(null);
  const [energy, setEnergy] = useState<number | null>(null);

  function setMuscle(m: MuscleGroup, level: 1 | 2 | 3) {
    setSoreness((prev) => {
      const next = { ...prev };
      if (prev[m] === level) {
        delete next[m]; // toggle off
      } else {
        next[m] = level;
      }
      return next;
    });
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch('/api/strength/recovery-check', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            workout_log_id: workoutLogId,
            recorded_on: recordedOn,
            muscle_soreness: soreness,
            joint_pain: jointPain,
            energy_1_5: energy,
          }),
        });
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as {
            error?: string;
          };
          throw new Error(body.error ?? `Save failed (${res.status})`);
        }
        router.refresh();
      } catch (err) {
        setError((err as Error).message);
      }
    });
  }

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-base font-medium text-zinc-900 dark:text-zinc-100">
          Recovery check
        </h2>
        <span className="text-[11px] uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          {yesterdayLabel}&rsquo;s session
        </span>
      </div>
      {liftSummary && (
        <p className="mt-1 text-[12px] leading-relaxed text-zinc-500 dark:text-zinc-400">
          {liftSummary}
        </p>
      )}
      <p className="mt-2 text-[13px] leading-relaxed text-zinc-600 dark:text-zinc-300">
        Mark anything that&rsquo;s still trashed today. Skip the rest. Mister P
        adjusts next session&rsquo;s volume off this signal.
      </p>

      <div className="mt-4 space-y-1.5">
        {MUSCLES.map((m) => (
          <div
            key={m.slug}
            className="flex items-center justify-between gap-3 rounded-md px-2 py-1.5 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
          >
            <span className="text-[13px] text-zinc-800 dark:text-zinc-200">
              {m.label}
            </span>
            <div className="flex shrink-0 gap-1">
              {([1, 2, 3] as const).map((lvl) => {
                const active = soreness[m.slug] === lvl;
                return (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setMuscle(m.slug, lvl)}
                    disabled={pending}
                    className={
                      active
                        ? 'rounded-md bg-zinc-900 px-2 py-1 text-[11px] font-medium text-white dark:bg-zinc-100 dark:text-zinc-900'
                        : 'rounded-md border border-zinc-200 px-2 py-1 text-[11px] text-zinc-600 hover:border-zinc-400 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-500'
                    }
                  >
                    {SORENESS_LABELS[lvl - 1]}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-zinc-200 pt-4 dark:border-zinc-800">
        <div className="flex items-center gap-2 text-[12px]">
          <span className="text-zinc-500 dark:text-zinc-400">Joint pain?</span>
          <button
            type="button"
            onClick={() => setJointPain(jointPain === true ? null : true)}
            disabled={pending}
            className={
              jointPain === true
                ? 'rounded-md bg-amber-700 px-2 py-1 font-medium text-white dark:bg-amber-300 dark:text-amber-950'
                : 'rounded-md border border-zinc-200 px-2 py-1 text-zinc-600 hover:border-zinc-400 dark:border-zinc-700 dark:text-zinc-400'
            }
          >
            Yes
          </button>
          <button
            type="button"
            onClick={() => setJointPain(jointPain === false ? null : false)}
            disabled={pending}
            className={
              jointPain === false
                ? 'rounded-md bg-zinc-900 px-2 py-1 font-medium text-white dark:bg-zinc-100 dark:text-zinc-900'
                : 'rounded-md border border-zinc-200 px-2 py-1 text-zinc-600 hover:border-zinc-400 dark:border-zinc-700 dark:text-zinc-400'
            }
          >
            No
          </button>
        </div>
        <div className="flex items-center gap-2 text-[12px]">
          <span className="text-zinc-500 dark:text-zinc-400">Energy</span>
          {([1, 2, 3, 4, 5] as const).map((lvl) => {
            const active = energy === lvl;
            return (
              <button
                key={lvl}
                type="button"
                onClick={() => setEnergy(active ? null : lvl)}
                disabled={pending}
                className={
                  active
                    ? 'h-6 w-6 rounded-full bg-zinc-900 text-[11px] font-medium text-white dark:bg-zinc-100 dark:text-zinc-900'
                    : 'h-6 w-6 rounded-full border border-zinc-200 text-[11px] text-zinc-500 hover:border-zinc-400 dark:border-zinc-700 dark:text-zinc-400'
                }
              >
                {lvl}
              </button>
            );
          })}
        </div>
      </div>

      {error && (
        <p className="mt-3 text-[12px] text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      <div className="mt-4 flex justify-end">
        <button
          type="button"
          onClick={submit}
          disabled={pending}
          className="rounded-lg bg-zinc-900 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {pending ? 'Saving…' : 'Save check'}
        </button>
      </div>
    </section>
  );
}
