'use client';

// Day-90 re-survey card. Three short questions refresh the user's
// focus areas, motivation segment, and "one specific thing" framing.
// Downstream surfaces (journey ordering on /today, motivation-aware
// prompts, monthly checkpoint's specific_thing mirror) read these
// updated values directly from survey_responses.
//
// Pre-Sub-ship-B, the card also surfaced ranker-suggested goals
// after save. The goal-suggestion sub-feature retired alongside the
// rest of the goals system (2026-05-10). The form half of the card
// remains valuable as a focus-signal refresh; "view: 'suggestions'"
// was replaced with "view: 'saved'" — a one-line confirmation.

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { QuarterlySurveyPrior } from '@/lib/quarterly-survey/service';

type Props = {
  prior: QuarterlySurveyPrior;
};

// Mirrors the onboarding picker (lib/onboarding/questions.ts focus_areas
// options) so quarterly refocus picks map 1:1 to shipped journeys.
// Legacy values from earlier survey vocabulary (fitness, skin,
// facial_aesthetics, posture, grooming, anti_aging) remain valid in
// stored survey_responses for users who pre-date this update — only
// the picker UI is updated.
const FOCUS_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'hair', label: 'Hair' },
  { value: 'style', label: 'Style' },
  { value: 'body_composition', label: 'Body composition' },
  { value: 'strength', label: 'Strength' },
  { value: 'cardio', label: 'Cardio' },
  { value: 'sleep', label: 'Sleep' },
  { value: 'skincare', label: 'Skincare' },
  { value: 'facial_hair', label: 'Facial hair' },
];

const MOTIVATION_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'feel-better-in-own-skin', label: 'I want to feel better in my own skin' },
  { value: 'social-professional-confidence', label: 'I want to feel more confident socially or professionally' },
  { value: 'specific-event', label: 'I’m preparing for a specific event or life change' },
  { value: 'structured-plan', label: 'I want a structured plan for self-improvement' },
  { value: 'something-specific-bothering-me', label: 'Something specific is bothering me' },
  { value: 'maintenance-aging', label: 'I want to maintain how I look and defend against age-related decline' },
  { value: 'not-sure-yet', label: 'Honestly, I’m not sure yet' },
];

const MAX_FOCUS = 3;

type View = 'intro' | 'form' | 'saved';

export function QuarterlySurveyCard({ prior }: Props) {
  const router = useRouter();
  const [view, setView] = useState<View>('intro');
  const [focusAreas, setFocusAreas] = useState<string[]>(prior.focusAreas);
  const [motivation, setMotivation] = useState<string>(prior.motivationSegment ?? '');
  const [specificThing, setSpecificThing] = useState<string>(prior.specificThing ?? '');
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
      setError('Pick what’s bringing you here right now.');
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
        setView('saved');
      } catch (err) {
        setError((err as Error).message);
      }
    });
  }

  function dismiss() {
    router.refresh();
  }

  if (view === 'intro') {
    return (
      <section className="rounded-xl border border-zinc-300 bg-zinc-50 p-6 dark:border-zinc-700 dark:bg-zinc-900">
        <h2 className="text-lg font-medium">Ninety days in. A quick refocus?</h2>
        <p className="mt-2 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
          Three short questions about your current direction &mdash;
          focus areas, what&rsquo;s bringing you here, and anything
          specific on your mind. Takes a minute. The updated answers
          refresh your journey ordering and the prompts Mister P uses.
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
            {pending ? 'Saving…' : 'Save'}
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

  // view === 'saved'
  return (
    <section className="rounded-xl border border-zinc-300 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-900">
      <h2 className="text-lg font-medium">Saved.</h2>
      <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">
        Your focus areas, motivation, and specific-thing answer have
        been updated. The new values are already in effect across
        /today and the prompts Mister P uses.
      </p>
      <button
        type="button"
        onClick={dismiss}
        className="mt-4 text-xs text-zinc-600 underline dark:text-zinc-400"
      >
        Done, close this
      </button>
    </section>
  );
}
