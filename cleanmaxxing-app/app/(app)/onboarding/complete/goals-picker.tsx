'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { TierBadge } from '@/components/tier-badge';

type Goal = {
  source_slug: string;
  title: string;
  description: string;
  plain_language: string | null;
  category: string;
  priority_tier: string;
  goal_type: 'process' | 'outcome';
  score: number;
};

type BaselineStage = 'new' | 'light' | 'partial' | 'established';

const BASELINE_LABEL: Record<BaselineStage, string> = {
  new: 'Just starting',
  light: 'Some experience',
  partial: 'Mostly consistent',
  established: 'Already consistent',
};

type SuggestionsResponse = {
  suggested: Goal[];
  alternatives: Goal[];
};

const MIN_PROCESS_GOALS = 2;

const AGE_SEGMENT_LABEL: Record<string, string> = {
  '18-24': '18\u201324',
  '25-32': '25\u201332',
  '33-40': '33\u201340',
  '41-45': '41\u201345',
};

// Labels mirror the survey question options in lib/onboarding/questions.ts.
// Duplicated intentionally rather than re-imported so this client component
// doesn't pull the full question catalog into its bundle.
const FOCUS_AREA_LABEL: Record<string, string> = {
  fitness: 'fitness',
  body_composition: 'body composition',
  skin: 'skin',
  hair: 'hair',
  facial_aesthetics: 'facial aesthetics',
  style: 'style',
  posture: 'posture',
  grooming: 'grooming',
  anti_aging: 'anti-aging',
};

function joinWithAnd(parts: string[]): string {
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return `${parts[0]} and ${parts[1]}`;
  return `${parts.slice(0, -1).join(', ')}, and ${parts[parts.length - 1]}`;
}

type GoalsPickerProps = {
  ageSegment: string;
  focusAreas: string[];
};

export function GoalsPicker({ ageSegment, focusAreas }: GoalsPickerProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [current, setCurrent] = useState<Goal[]>([]);
  const [alternatives, setAlternatives] = useState<Goal[]>([]);
  const [submitting, startSubmitTransition] = useTransition();
  // Process-goal soft-override nudge (spec §2 Feature 1). When the user
  // clicks "Start with these" and fewer than 2 goals are process-oriented,
  // we show an inline prompt with a one-tap swap. User can dismiss and
  // continue. Tracked per-session — if dismissed, the prompt stays
  // dismissed for this onboarding completion run.
  const [nudgeDismissed, setNudgeDismissed] = useState(false);
  const [showNudge, setShowNudge] = useState(false);
  // Baseline stage per goal, keyed by source_slug. Defaults to 'new' for
  // any goal the user hasn't explicitly set — same as the DB default.
  const [baselines, setBaselines] = useState<Record<string, BaselineStage>>({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/onboarding/suggestions');
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          if (!cancelled) setError(body.error ?? 'Could not load suggestions.');
          return;
        }
        const data: SuggestionsResponse = await res.json();
        if (cancelled) return;
        setCurrent(data.suggested);
        setAlternatives(data.alternatives);
      } catch {
        if (!cancelled) setError('Network error loading suggestions.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function swap(index: number) {
    if (alternatives.length === 0) return;
    const [next, ...rest] = alternatives;
    const replaced = current[index];
    const nextCurrent = [...current];
    nextCurrent[index] = next;
    setCurrent(nextCurrent);
    setAlternatives([...rest, replaced]);
  }

  function processCount(goals: Goal[]): number {
    return goals.filter((g) => g.goal_type === 'process').length;
  }

  // Swap the lowest-scoring outcome goal for the highest-scoring unused
  // process goal from the alternatives queue. No-op if there are no
  // outcome goals in current or no process goals in alternatives.
  function swapToProcess() {
    const outcomeIndices = current
      .map((g, i) => ({ g, i }))
      .filter((x) => x.g.goal_type === 'outcome');
    if (outcomeIndices.length === 0) return;

    const processAlt = alternatives.find((a) => a.goal_type === 'process');
    if (!processAlt) return;

    // Lowest-scoring outcome in current (scores are already sorted desc in the API,
    // so the last outcome in iteration order is the lowest).
    const target = outcomeIndices.reduce((lo, cur) =>
      cur.g.score < lo.g.score ? cur : lo
    );

    const replaced = current[target.i];
    const nextCurrent = [...current];
    nextCurrent[target.i] = processAlt;
    setCurrent(nextCurrent);
    setAlternatives([
      ...alternatives.filter((a) => a.source_slug !== processAlt.source_slug),
      replaced,
    ]);
    setShowNudge(false);
  }

  async function accept() {
    setError(null);

    // Process-goal soft override. If fewer than 2 of 3 are process goals
    // and the nudge hasn't been dismissed yet, show the prompt and halt.
    if (!nudgeDismissed && processCount(current) < MIN_PROCESS_GOALS) {
      setShowNudge(true);
      return;
    }

    const res = await fetch('/api/goals/accept', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        goals: current.map(({ source_slug, title, description, category, priority_tier, goal_type }) => ({
          source_slug,
          title,
          description,
          category,
          priority_tier,
          goal_type,
          baseline_stage: baselines[source_slug] ?? 'new',
        })),
      }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? 'Could not save goals.');
      return;
    }
    startSubmitTransition(() => {
      router.push('/today?welcome=1');
      router.refresh();
    });
  }

  if (loading) {
    return <p className="text-sm text-zinc-500">Building your suggestions…</p>;
  }

  if (error && current.length === 0) {
    return (
      <div>
        <p className="text-sm text-red-600">{error}</p>
        <button
          type="button"
          onClick={() => location.reload()}
          className="mt-4 rounded-lg border border-zinc-300 px-4 py-2 text-sm dark:border-zinc-700"
        >
          Try again
        </button>
      </div>
    );
  }

  if (current.length === 0) {
    return (
      <p className="text-sm text-zinc-500">
        No suggestions matched your profile. That&rsquo;s unusual &mdash; please contact support.
      </p>
    );
  }

  const focusLabels = focusAreas
    .map((f) => FOCUS_AREA_LABEL[f])
    .filter((l): l is string => Boolean(l));
  const ageLabel = AGE_SEGMENT_LABEL[ageSegment] ?? ageSegment;
  const processInCurrent = processCount(current);
  const outcomeInCurrent = current.length - processInCurrent;

  return (
    <div className="flex flex-1 flex-col">
      <section className="mb-6 rounded-xl border border-zinc-200 bg-zinc-50 p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-sm font-semibold tracking-wide text-zinc-900 dark:text-zinc-100">
          Why these three?
        </h2>
        <ul className="mt-3 space-y-2 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
          <li>
            <strong className="font-medium text-zinc-900 dark:text-zinc-100">
              Your inputs:
            </strong>{' '}
            age {ageLabel}
            {focusLabels.length > 0 && (
              <> &middot; focused on {joinWithAnd(focusLabels)}</>
            )}
            .
          </li>
          <li>
            <strong className="font-medium text-zinc-900 dark:text-zinc-100">
              The hierarchy:
            </strong>{' '}
            Cleanmaxxing ranks interventions Foundation &rarr; high impact
            &rarr; refinement. We start you at the bottom of that ladder
            because those returns compound into everything above them.
          </li>
          <li>
            <strong className="font-medium text-zinc-900 dark:text-zinc-100">
              Process over outcome:
            </strong>{' '}
            you&rsquo;ve got {processInCurrent} process goal
            {processInCurrent === 1 ? '' : 's'} (things you do) and{' '}
            {outcomeInCurrent} outcome goal
            {outcomeInCurrent === 1 ? '' : 's'} (things you&rsquo;re becoming).
            Process-heavy tends to stick; you can swap below.
          </li>
        </ul>
        <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
          Tap any tier label on a goal to see what that tier means.
        </p>
      </section>
      <ul className="flex flex-col gap-4">
        {current.map((goal, i) => (
          <li
            key={goal.source_slug + i}
            className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div className="mb-2 flex items-center gap-2 text-xs">
              <TierBadge tier={goal.priority_tier} />
              <span
                className={`rounded-full px-2 py-0.5 ${
                  goal.goal_type === 'process'
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                    : 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                }`}
              >
                {goal.goal_type}
              </span>
            </div>
            <h2 className="text-lg font-semibold leading-tight">{goal.title}</h2>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              {goal.description}
            </p>
            {goal.plain_language && (
              <details className="mt-3">
                <summary className="cursor-pointer text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100">
                  What does this mean?
                </summary>
                <p className="mt-2 text-sm italic text-zinc-600 dark:text-zinc-400">
                  {goal.plain_language}
                </p>
              </details>
            )}
            {goal.goal_type === 'outcome' && (
              <p className="mt-2 text-xs italic text-zinc-500">
                Outcome goals work well for some people and trigger others. Process goals are safer by default.
              </p>
            )}
            <div className="mt-4">
              <label
                htmlFor={`baseline-${goal.source_slug}`}
                className="block text-xs text-zinc-600 dark:text-zinc-400"
              >
                How much of this are you already doing?
              </label>
              <select
                id={`baseline-${goal.source_slug}`}
                value={baselines[goal.source_slug] ?? 'new'}
                onChange={(e) =>
                  setBaselines((prev) => ({
                    ...prev,
                    [goal.source_slug]: e.target.value as BaselineStage,
                  }))
                }
                className="mt-1.5 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              >
                <option value="new">{BASELINE_LABEL.new}</option>
                <option value="light">{BASELINE_LABEL.light}</option>
                <option value="partial">{BASELINE_LABEL.partial}</option>
                <option value="established">{BASELINE_LABEL.established}</option>
              </select>
            </div>
            <button
              type="button"
              onClick={() => swap(i)}
              disabled={alternatives.length === 0}
              className="mt-4 text-xs text-zinc-600 underline disabled:opacity-40 dark:text-zinc-400"
            >
              Swap this one
            </button>
          </li>
        ))}
      </ul>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      {showNudge && (
        <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/30">
          <p className="text-sm text-amber-900 dark:text-amber-200">
            Most people get better results with at least 2 process goals. Process goals
            are things you do; outcome goals are things you&rsquo;re trying to become.
            Want to swap one?
          </p>
          <div className="mt-3 flex items-center gap-3">
            <button
              type="button"
              onClick={swapToProcess}
              className="rounded-lg bg-zinc-900 px-4 py-2 text-xs font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
            >
              Swap one
            </button>
            <button
              type="button"
              onClick={() => {
                setNudgeDismissed(true);
                setShowNudge(false);
              }}
              className="text-xs text-zinc-600 underline dark:text-zinc-400"
            >
              Keep my picks
            </button>
          </div>
        </div>
      )}

      <div className="mt-8">
        <button
          type="button"
          onClick={accept}
          disabled={submitting}
          className="w-full rounded-lg bg-zinc-900 px-6 py-3 text-sm font-medium text-white disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
        >
          Start with these
        </button>
        <p className="mt-3 text-center text-xs text-zinc-500">
          You can add, swap, or pause goals any time from /goals.
        </p>
      </div>
    </div>
  );
}
