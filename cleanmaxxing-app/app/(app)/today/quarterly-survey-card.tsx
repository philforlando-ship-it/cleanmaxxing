'use client';

// Day-90 re-survey card. Collapsed default shows a short intro + Start
// button; expanded shows the three questions (focus areas, motivation,
// specific thing). On save, the card switches to a "suggestions" state
// listing up to three fresh goals produced by the ranker against the
// updated inputs. The user can add any suggestion to their goals via
// /api/goals/add without leaving /today.
//
// Completion state is written server-side via survey_responses, so the
// card simply disappears on the next /today load once saved.

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { TierBadge } from '@/components/tier-badge';
import type { QuarterlySurveyPrior } from '@/lib/quarterly-survey/service';
import type { SuggestedGoal } from '@/lib/onboarding/goal-suggest';

type Props = {
  prior: QuarterlySurveyPrior;
};

const FOCUS_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'fitness', label: 'Fitness' },
  { value: 'body_composition', label: 'Body composition' },
  { value: 'skin', label: 'Skin' },
  { value: 'hair', label: 'Hair' },
  { value: 'facial_aesthetics', label: 'Facial aesthetics' },
  { value: 'style', label: 'Style' },
  { value: 'posture', label: 'Posture' },
  { value: 'grooming', label: 'Grooming' },
  { value: 'anti_aging', label: 'Anti-aging' },
];

const MOTIVATION_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'feel-better-in-own-skin', label: 'I want to feel better in my own skin' },
  { value: 'social-professional-confidence', label: 'I want to feel more confident socially or professionally' },
  { value: 'specific-event', label: 'I\u2019m preparing for a specific event or life change' },
  { value: 'structured-plan', label: 'I want a structured plan for self-improvement' },
  { value: 'something-specific-bothering-me', label: 'Something specific is bothering me' },
  { value: 'maintenance-aging', label: 'I want to maintain how I look and defend against age-related decline' },
  { value: 'not-sure-yet', label: 'Honestly, I\u2019m not sure yet' },
];

const MAX_FOCUS = 3;

type View = 'intro' | 'form' | 'suggestions';

export function QuarterlySurveyCard({ prior }: Props) {
  const router = useRouter();
  const [view, setView] = useState<View>('intro');
  const [focusAreas, setFocusAreas] = useState<string[]>(prior.focusAreas);
  const [motivation, setMotivation] = useState<string>(prior.motivationSegment ?? '');
  const [specificThing, setSpecificThing] = useState<string>(prior.specificThing ?? '');
  const [suggestions, setSuggestions] = useState<SuggestedGoal[]>([]);
  const [addedSlugs, setAddedSlugs] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function toggleFocus(value: string) {
    setError(null);
    setFocusAreas((prev) => {
      if (prev.includes(value)) return prev.filter((v) => v !== value);
      if (prev.length >= MAX_FOCUS) return prev; // cap enforced client-side
      return [...prev, value];
    });
  }

  function submit() {
    setError(null);
    if (focusAreas.length === 0) {
      setError('Pick at least one focus area.');
      return;
    }
    if (!motivation) {
      setError('Pick what\u2019s bringing you here right now.');
      return;
    }
    startTransition(async () => {
      try {
        const res = await fetch('/api/quarterly-survey', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            focusAreas,
            motivationSegment: motivation,
            specificThing: specificThing.trim() ? specificThing.trim() : null,
          }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? `Save failed (${res.status})`);
        }
        const body = (await res.json()) as { suggestions: SuggestedGoal[] };
        setSuggestions(body.suggestions);
        setView('suggestions');
      } catch (err) {
        setError((err as Error).message);
      }
    });
  }

  async function addGoal(goal: SuggestedGoal) {
    setError(null);
    try {
      const res = await fetch('/api/goals/add', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          source_slug: goal.source_slug,
          title: goal.title,
          description: goal.description,
          category: goal.category,
          priority_tier: goal.priority_tier,
          goal_type: goal.goal_type,
          force: true, // user explicitly picked; don't surface the 5-goal cap nudge mid-survey
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Add failed (${res.status})`);
      }
      setAddedSlugs((prev) => new Set(prev).add(goal.source_slug));
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  function dismiss() {
    router.refresh();
  }

  if (view === 'intro') {
    return (
      <section className="rounded-xl border border-zinc-300 bg-zinc-50 p-6 dark:border-zinc-700 dark:bg-zinc-900">
        <h2 className="text-lg font-medium">Ninety days in. A quick refocus?</h2>
        <p className="mt-2 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
          Three short questions about your current direction &mdash; focus areas,
          what\u2019s bringing you here, and anything specific on your mind. Takes a
          minute. We&rsquo;ll regenerate goal suggestions based on your updated
          answers.
        </p>
        <button
          type="button"
          onClick={() => setView('form')}
          className="mt-4 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
        >
          Start check-in
        </button>
      </section>
    );
  }

  if (view === 'form') {
    return (
      <section className="rounded-xl border border-zinc-300 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-900">
        <h2 className="text-lg font-medium">Ninety-day refocus</h2>

        <div className="mt-5">
          <label className="block text-sm font-medium text-zinc-900 dark:text-zinc-100">
            Which of these do you most want to improve now?
          </label>
          <p className="mt-1 text-xs text-zinc-500">Pick up to 3. Your prior picks are pre-selected.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {FOCUS_OPTIONS.map((opt) => {
              const selected = focusAreas.includes(opt.value);
              const disabled =
                !selected && focusAreas.length >= MAX_FOCUS;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => toggleFocus(opt.value)}
                  disabled={disabled || pending}
                  className={
                    selected
                      ? 'rounded-full bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white dark:bg-zinc-100 dark:text-zinc-900'
                      : 'rounded-full border border-zinc-300 px-3 py-1.5 text-xs text-zinc-700 hover:bg-zinc-100 disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800'
                  }
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-6">
          <label className="block text-sm font-medium text-zinc-900 dark:text-zinc-100">
            What&rsquo;s bringing you to Cleanmaxxing right now?
          </label>
          <div className="mt-3 space-y-2">
            {MOTIVATION_OPTIONS.map((opt) => (
              <label key={opt.value} className="flex items-start gap-2 text-sm">
                <input
                  type="radio"
                  name="motivation"
                  value={opt.value}
                  checked={motivation === opt.value}
                  onChange={() => setMotivation(opt.value)}
                  disabled={pending}
                  className="mt-0.5"
                />
                <span>{opt.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="mt-6">
          <label
            htmlFor="specificThing"
            className="block text-sm font-medium text-zinc-900 dark:text-zinc-100"
          >
            Is there one specific thing you think about more than you&rsquo;d like to?
          </label>
          <p className="mt-1 text-xs text-zinc-500">Optional. You can skip this.</p>
          <textarea
            id="specificThing"
            value={specificThing}
            onChange={(e) => setSpecificThing(e.target.value)}
            disabled={pending}
            rows={3}
            className="mt-2 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          />
        </div>

        {error && <p className="mt-4 text-sm text-red-600 dark:text-red-400">{error}</p>}

        <div className="mt-6 flex items-center gap-2">
          <button
            type="button"
            onClick={submit}
            disabled={pending}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
          >
            {pending ? 'Saving\u2026' : 'Save and see suggestions'}
          </button>
          <button
            type="button"
            onClick={() => setView('intro')}
            disabled={pending}
            className="rounded-lg border border-zinc-300 px-3 py-2 text-xs text-zinc-700 hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Back
          </button>
        </div>
      </section>
    );
  }

  // view === 'suggestions'
  return (
    <section className="rounded-xl border border-zinc-300 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-900">
      <h2 className="text-lg font-medium">Saved. Here&rsquo;s what the ranker suggests now.</h2>
      <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">
        These are the highest-impact goals you haven&rsquo;t tried yet, ranked
        against your updated focus areas and motivation. Add any that make
        sense right now; skip the rest.
      </p>

      {suggestions.length === 0 && (
        <p className="mt-4 text-sm text-zinc-500">
          Nothing fresh to recommend \u2014 either you\u2019ve already picked the
          highest-impact options for your profile, or the POV corpus doesn\u2019t
          have a strong match for your current inputs.
        </p>
      )}

      <ul className="mt-4 flex flex-col gap-3">
        {suggestions.map((goal) => {
          const added = addedSlugs.has(goal.source_slug);
          return (
            <li
              key={goal.source_slug}
              className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800"
            >
              <div className="flex items-center gap-2 text-xs">
                <TierBadge tier={goal.priority_tier} />
                <span
                  className={
                    goal.goal_type === 'process'
                      ? 'rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                      : 'rounded-full bg-amber-50 px-2 py-0.5 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                  }
                >
                  {goal.goal_type}
                </span>
              </div>
              <div className="mt-2 text-sm font-semibold">{goal.title}</div>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{goal.description}</p>
              <button
                type="button"
                onClick={() => addGoal(goal)}
                disabled={added}
                className="mt-3 rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
              >
                {added ? 'Added' : 'Add to my goals'}
              </button>
            </li>
          );
        })}
      </ul>

      {error && <p className="mt-4 text-sm text-red-600 dark:text-red-400">{error}</p>}

      <button
        type="button"
        onClick={dismiss}
        className="mt-5 text-xs text-zinc-600 underline dark:text-zinc-400"
      >
        Done, close this
      </button>
    </section>
  );
}
