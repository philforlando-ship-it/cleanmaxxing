'use client';

// Stage 2 card on /plan/hair. Three states driven by the assessment row:
//   1. locked          → Stage 1 not complete; show locked tile
//   2. unlocked        → present three branches; user picks one
//   3. locked-in       → collapsed summary; "Treat" links to the spawned
//                        Pattern D goal page when we have the id
//
// Decision-support content (STAGE_2_BRANCHES) lives in lib/hair/stage-2-content.ts
// rather than being LLM-generated — Stage 2 is the user's hard call and
// the framing for each branch is consistent across users.

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  STAGE_2_BRANCHES,
  softenedTreatCopyFor,
  suggestStage2Path,
  type Stage2BranchCopy,
  type Stage2ModifierContext,
} from '@/lib/hair/stage-2-content';
import {
  STAGE_2_PATH_LABEL,
  type CutFamily,
  type DensityState,
  type Stage2Path,
} from '@/lib/hair/types';

type Props = {
  stage1Complete: boolean;
  stage2Path: Stage2Path | null;
  stage2LockedInAt: string | null;
  densityState: DensityState;
  currentInterventions: string[];
  /** Stage 1's recommended cut family. Used to weight the suggestion —
   *  if Stage 1 picked bald_track or clean_shave, Stage 2 should
   *  reinforce Transition rather than re-litigate the call here. */
  cutFamily: CutFamily | null;
  /** User age (from users.age). Used by the suggestion logic to
   *  surface POV 08's age-segmented guidance — at 40+ with advanced
   *  loss, transition is the framework's read; at <=35 with active
   *  loss, treat is the early-intervention window. */
  age: number | null;
};

export function HairStage2Card({
  stage1Complete,
  stage2Path,
  stage2LockedInAt,
  densityState,
  currentInterventions,
  cutFamily,
  age,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // State 1 — locked.
  if (!stage1Complete) {
    return (
      <section className="mt-6 rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-5 py-4 dark:border-zinc-700 dark:bg-zinc-900/50">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-sm">
          <span className="font-medium text-zinc-700 dark:text-zinc-300">
            Stage 2 — Density action
          </span>
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            Unlocks when Stage 1 is done
          </span>
        </div>
      </section>
    );
  }

  // State 3 — locked in.
  if (stage2Path && stage2LockedInAt) {
    return (
      <section className="mt-6 rounded-xl border border-zinc-200 bg-white px-5 py-3 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-sm">
          <span className="text-zinc-700 dark:text-zinc-300">
            <span className="font-medium">Stage 2 — Density</span>
            <span className="text-zinc-500">
              {' · '}
              {STAGE_2_PATH_LABEL[stage2Path].split(' — ')[0]}
            </span>
          </span>
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            Locked in{' '}
            {new Date(stage2LockedInAt).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
            })}
          </span>
        </div>
        {stage2Path === 'treat' && (
          <p className="mt-2 text-xs text-zinc-600 dark:text-zinc-400">
            Treat path locked in. The full protocol surface (titration,
            labs, side-effect log) is on the roadmap. The Pattern D
            Considering card on this page is the current home for that
            work.
          </p>
        )}
      </section>
    );
  }

  // State 2 — unlocked, awaiting decision.
  const ctx: Stage2ModifierContext = {
    density_state: densityState,
    current_interventions: currentInterventions,
    cut_family: cutFamily,
    age,
  };
  const suggestion = suggestStage2Path(ctx);
  const softenedTreat = softenedTreatCopyFor(ctx);

  function lockIn(path: Stage2Path) {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch('/api/plan/hair/stage-2/lock-in', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ path }),
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

  return (
    <section className="mt-6 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
        Stage 2 — Density action
      </h2>
      <p className="mt-2 text-[14px] leading-relaxed text-zinc-700 dark:text-zinc-300">
        Three paths. You pick one. Mister P doesn’t pick for you — this is a
        decision you own.
      </p>

      {suggestion && (
        <p className="mt-4 rounded-md border border-zinc-300 bg-zinc-50 px-4 py-2 text-sm text-zinc-800 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200">
          <strong className="font-semibold">
            Mister P thinks this is your path:{' '}
            {STAGE_2_PATH_LABEL[suggestion.path].split(' — ')[0]}.
          </strong>{' '}
          {suggestion.reason}
        </p>
      )}

      <div className="mt-6 space-y-4">
        {(['treat', 'monitor', 'transition'] as const).map((path) => {
          const copy: Stage2BranchCopy =
            path === 'treat' && softenedTreat
              ? softenedTreat
              : STAGE_2_BRANCHES[path];
          const isSuggested = suggestion?.path === path;
          return (
            <article
              key={path}
              className={
                isSuggested
                  ? 'rounded-lg border border-zinc-900 bg-zinc-50 p-5 dark:border-zinc-100 dark:bg-zinc-800'
                  : 'rounded-lg border border-zinc-200 p-5 dark:border-zinc-800'
              }
            >
              <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                {copy.headline}
              </h3>
              <p className="mt-2 text-[14px] leading-relaxed text-zinc-800 dark:text-zinc-200">
                {copy.pitch}
              </p>
              <p className="mt-3 text-[13px] leading-relaxed text-zinc-700 dark:text-zinc-300">
                <strong className="font-semibold text-zinc-900 dark:text-zinc-100">
                  What happens:
                </strong>{' '}
                {copy.what_happens}
              </p>
              <p className="mt-2 text-[13px] leading-relaxed text-zinc-700 dark:text-zinc-300">
                <strong className="font-semibold text-zinc-900 dark:text-zinc-100">
                  Commitment:
                </strong>{' '}
                {copy.commitment}
              </p>
              <div className="mt-4">
                <button
                  type="button"
                  onClick={() => lockIn(path)}
                  disabled={pending}
                  className={
                    isSuggested
                      ? 'rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200'
                      : 'rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-800'
                  }
                >
                  {pending ? 'Saving…' : `Pick ${copy.headline}`}
                </button>
              </div>
            </article>
          );
        })}
      </div>

      {error && (
        <p className="mt-4 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </section>
  );
}
