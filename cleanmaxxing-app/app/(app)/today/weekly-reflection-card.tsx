'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type {
  ReflectionDimensions,
  WeeklyReflectionState,
} from '@/lib/weekly-reflection/service';
import { averageConfidence } from '@/lib/weekly-reflection/service';
import { contextFor } from '@/lib/confidence/context';
import { ConfidenceTrendChart } from './confidence-trend-chart';
import type { WeeklyCheckInSummary } from '@/lib/check-in/service';

type Props = {
  initialState: WeeklyReflectionState;
  // Rolling 7-day check-in totals, used to render the post-reflection
  // recap inside the saved view. Optional — the card still works
  // without it (recap just skips the completion line).
  weeklySummary?: WeeklyCheckInSummary;
};

// Rendered inside the saved view of the reflection card. Pulls numbers
// from data already on hand (current reflection, prior reflection,
// weekly summary) so there's no extra query. Scoped to the handful of
// data points that actually matter the moment after reflection save:
// completion for the week just reflected on, and per-dimension deltas
// vs. the prior reflection (only surfaced when the move is 1+ point —
// sub-1-point noise isn't signal).
function WeeklyRecap({
  current,
  prior,
  summary,
}: {
  current: ReflectionDimensions;
  prior: ReflectionDimensions | null;
  summary: WeeklyCheckInSummary | undefined;
}) {
  const deltas: Array<{ label: string; delta: number }> = [];
  if (prior) {
    const dims: Array<[keyof ReflectionDimensions, string]> = [
      ['social_confidence', 'Social'],
      ['work_confidence', 'Work'],
      ['physical_confidence', 'Physical'],
      ['appearance_confidence', 'Appearance'],
    ];
    for (const [key, label] of dims) {
      const d = current[key] - prior[key];
      if (Math.abs(d) >= 1) deltas.push({ label, delta: d });
    }
  }

  const showCompletion =
    summary !== undefined && summary.goalCount > 0 && summary.possible > 0;
  if (!showCompletion && deltas.length === 0 && !prior) return null;

  return (
    <div className="mt-5 rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
        This week in one glance
      </div>
      <ul className="mt-2 space-y-1 text-sm text-zinc-800 dark:text-zinc-200">
        {showCompletion && (
          <li>
            Ticked <strong>{summary.ticked}</strong> of{' '}
            <strong>{summary.possible}</strong> possible goal slots over the
            last 7 days.
          </li>
        )}
        {!prior && (
          <li className="text-zinc-600 dark:text-zinc-400">
            First reflection saved. Next week&rsquo;s will show deltas.
          </li>
        )}
        {deltas.map((d) => {
          const sign = d.delta > 0 ? '+' : '';
          const tone =
            d.delta > 0
              ? 'text-emerald-700 dark:text-emerald-400'
              : 'text-amber-700 dark:text-amber-400';
          return (
            <li key={d.label}>
              {d.label}:{' '}
              <span className={`font-medium ${tone}`}>
                {sign}
                {d.delta}
              </span>{' '}
              vs. last reflection.
            </li>
          );
        })}
      </ul>
    </div>
  );
}

const DIMENSIONS: Array<{
  key: keyof ReflectionDimensions;
  label: string;
  prompt: string;
}> = [
  {
    key: 'social_confidence',
    label: 'Social',
    prompt: 'This week, in social situations, I felt…',
  },
  {
    key: 'work_confidence',
    label: 'Work',
    prompt: 'This week, at work or school, I felt…',
  },
  {
    key: 'physical_confidence',
    label: 'Physical',
    prompt: 'This week, in my body physically, I felt…',
  },
  {
    key: 'appearance_confidence',
    label: 'Appearance',
    prompt: 'This week, about how I look, I felt…',
  },
];

const DEFAULTS: ReflectionDimensions = {
  social_confidence: 5,
  work_confidence: 5,
  physical_confidence: 5,
  appearance_confidence: 5,
};

export function WeeklyReflectionCard({ initialState, weeklySummary }: Props) {
  const [state, setState] = useState<WeeklyReflectionState>(initialState);
  const [editing, setEditing] = useState<boolean>(initialState.current === null);
  const [draft, setDraft] = useState<ReflectionDimensions>(() =>
    initialState.current
      ? {
          social_confidence: initialState.current.social_confidence,
          work_confidence: initialState.current.work_confidence,
          physical_confidence: initialState.current.physical_confidence,
          appearance_confidence: initialState.current.appearance_confidence,
        }
      : DEFAULTS
  );
  const [notes, setNotes] = useState<string>(initialState.current?.notes ?? '');
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function save() {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch('/api/weekly-reflection', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            ...draft,
            notes: notes.trim() ? notes.trim() : null,
          }),
        });
        if (!res.ok) throw new Error(`Save failed (${res.status})`);
        const next = (await res.json()) as WeeklyReflectionState;
        setState(next);
        setEditing(false);
        // Re-render the server component so sibling cards (the chart)
        // pick up the new reflection history. Without this, the chart
        // still holds whatever history was passed at page load.
        router.refresh();
      } catch (err) {
        setError((err as Error).message);
      }
    });
  }

  const current = state.current;

  if (!editing && current) {
    // Prior reflection for the recap's delta line. state.history is
    // sorted oldest-first and includes `current` at the tail when
    // saved, so the entry immediately before is last week's reflection.
    const priorReflection =
      state.history.length >= 2
        ? state.history[state.history.length - 2]
        : null;
    return (
      <section className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-lg font-medium">Weekly reflection</h2>
        <p className="mt-1 text-xs text-zinc-500">
          Week of {current.week_start} &middot; saved
        </p>
        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
          {DIMENSIONS.map((d) => {
            const score = current[d.key];
            const ctx = contextFor(score);
            return (
              <div key={d.key} className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
                <dt className="text-xs uppercase tracking-wide text-zinc-500">{d.label}</dt>
                <dd className="mt-1 text-base font-medium text-zinc-900 dark:text-zinc-100">
                  {score} <span className="text-xs font-normal text-zinc-500">· {ctx.label}</span>
                </dd>
              </div>
            );
          })}
        </dl>
        {current.notes && (
          <p className="mt-4 whitespace-pre-wrap text-sm text-zinc-700 dark:text-zinc-300">
            {current.notes}
          </p>
        )}
        <WeeklyRecap
          current={current}
          prior={priorReflection}
          summary={weeklySummary}
        />
        <p className="mt-4 text-xs text-zinc-500 dark:text-zinc-400">
          Locked for this week. Next reflection unlocks Monday &mdash;
          weekly is a fixed snapshot, not a running dial.
        </p>
      </section>
    );
  }

  // Live preview of the trend chart driven by the draft sliders. Users
  // see exactly where this week's reflection would land before they
  // save — the chart becomes the payoff for filling out the form,
  // rather than a thing that updates later and out of context.
  const pendingAvg = averageConfidence(draft);
  const pendingPoint = {
    week: state.week_start.slice(5),
    confidence: Number(pendingAvg.toFixed(2)),
  };

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="text-lg font-medium">Weekly reflection</h2>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        Takes about a minute. Four dimensions, 1–10, plus a note if you want one.
      </p>

      <div className="mt-5 rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
        <div className="mb-2 flex items-baseline justify-between gap-3">
          <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Your trend (live preview)
          </span>
          <span className="text-xs text-zinc-500">dashed = this week</span>
        </div>
        <ConfidenceTrendChart
          history={state.history}
          pendingPoint={pendingPoint}
          compact
        />
      </div>

      <div className="mt-5 space-y-5">
        {DIMENSIONS.map((d) => {
          const score = draft[d.key];
          const ctx = contextFor(score);
          return (
            <div key={d.key}>
              <div className="flex items-baseline justify-between gap-3">
                <label className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {d.prompt}
                </label>
                <span className="shrink-0 rounded-full bg-zinc-900 px-2.5 py-0.5 text-xs font-semibold tabular-nums text-white dark:bg-zinc-100 dark:text-zinc-900">
                  {score} · {ctx.label}
                </span>
              </div>
              <input
                type="range"
                min={1}
                max={10}
                step={1}
                value={score}
                disabled={pending}
                onChange={(e) =>
                  setDraft((prev) => ({ ...prev, [d.key]: Number(e.target.value) }))
                }
                className="mt-2 w-full accent-zinc-900 dark:accent-zinc-100"
              />
            </div>
          );
        })}

        <div>
          <label className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
            Notes (optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={pending}
            rows={3}
            placeholder="Anything you want to remember about this week?"
            className="mt-2 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          />
        </div>
      </div>

      {error && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}

      <div className="mt-5 flex items-center gap-2">
        <button
          type="button"
          onClick={save}
          disabled={pending}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {current ? 'Update reflection' : 'Save reflection'}
        </button>
        {current && (
          <button
            type="button"
            onClick={() => {
              setEditing(false);
              setError(null);
            }}
            disabled={pending}
            className="rounded-lg border border-zinc-300 px-3 py-2 text-xs text-zinc-700 hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Cancel
          </button>
        )}
      </div>
    </section>
  );
}
