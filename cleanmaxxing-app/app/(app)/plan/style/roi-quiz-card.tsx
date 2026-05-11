'use client';

// ROI quiz card on /plan/style. Engagement mechanic that teaches the
// cost-per-wear / foundation / "requires reasoning" framework by
// having the user guess high/medium/low ROI on real-world items, then
// revealing Mister P's call + reasoning.
//
// State machine:
//   IDLE                  — not started; intro + start button
//   ANSWERING (no pick)   — show current item + 3 tier buttons
//   ANSWERING (picked)    — show user's pick, correct tier, explanation, Next
//   DONE                  — score + closing principles + Try again
//
// No persistence — quiz state lives in component memory, resets on
// page navigation. Score isn't logged anywhere; the teaching is in
// the explanations, not the result.

import { useState } from 'react';
import {
  ROI_QUIZ_CLOSING_PRINCIPLES,
  ROI_QUIZ_ITEMS,
  ROI_TIER_LABEL,
  type RoiTier,
} from '@/lib/style/roi-quiz-content';
import ReactMarkdown from 'react-markdown';

type Answer = {
  item_id: string;
  picked: RoiTier;
  correct: boolean;
};

const TIER_OPTIONS: ReadonlyArray<RoiTier> = ['high', 'medium', 'low'];

export function RoiQuizCard() {
  const [started, setStarted] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentPick, setCurrentPick] = useState<RoiTier | null>(null);
  const [answers, setAnswers] = useState<ReadonlyArray<Answer>>([]);

  const total = ROI_QUIZ_ITEMS.length;
  const currentItem = ROI_QUIZ_ITEMS[currentIndex];
  const isDone = started && currentIndex >= total;

  function start() {
    setStarted(true);
    setCurrentIndex(0);
    setCurrentPick(null);
    setAnswers([]);
  }

  function pick(tier: RoiTier) {
    if (currentPick !== null) return;
    setCurrentPick(tier);
    setAnswers((prev) => [
      ...prev,
      {
        item_id: currentItem.id,
        picked: tier,
        correct: tier === currentItem.tier,
      },
    ]);
  }

  function next() {
    setCurrentPick(null);
    setCurrentIndex((i) => i + 1);
  }

  function reset() {
    setStarted(false);
    setCurrentIndex(0);
    setCurrentPick(null);
    setAnswers([]);
  }

  const correctCount = answers.filter((a) => a.correct).length;

  // ---- IDLE ----
  if (!started) {
    return (
      <section className="mt-10 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
          ROI quiz — high, medium, or low?
        </h2>
        <p className="mt-2 text-[14px] leading-relaxed text-zinc-700 dark:text-zinc-300">
          {total} purchases. For each, guess whether Mister P would
          call it high, medium, or low ROI. The point isn’t the score
          — it’s the reasoning that comes after each call. Cost-per-wear,
          foundation logic, status tax, and where the diminishing-returns
          line actually sits in each category.
        </p>
        <button
          type="button"
          onClick={start}
          className="mt-5 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          Start the quiz
        </button>
      </section>
    );
  }

  // ---- DONE ----
  if (isDone) {
    return (
      <section className="mt-10 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
          ROI quiz — done
        </h2>
        <p className="mt-2 text-[14px] leading-relaxed text-zinc-700 dark:text-zinc-300">
          You called {correctCount} of {total} the way Mister P would.
          The score isn’t the point. The principles below are.
        </p>

        <div className="mt-6 rounded-md border border-zinc-200 bg-zinc-50 px-4 py-4 dark:border-zinc-800 dark:bg-zinc-950">
          <ReactMarkdown
            components={{
              p: ({ children }) => (
                <p className="text-[14px] leading-relaxed text-zinc-800 dark:text-zinc-200">
                  {children}
                </p>
              ),
              ol: ({ children }) => (
                <ol className="mt-3 ml-5 list-decimal space-y-2 text-[14px] leading-relaxed text-zinc-800 dark:text-zinc-200">
                  {children}
                </ol>
              ),
              li: ({ children }) => <li className="pl-1">{children}</li>,
              strong: ({ children }) => (
                <strong className="font-semibold text-zinc-900 dark:text-zinc-100">
                  {children}
                </strong>
              ),
            }}
          >
            {ROI_QUIZ_CLOSING_PRINCIPLES}
          </ReactMarkdown>
        </div>

        <button
          type="button"
          onClick={reset}
          className="mt-6 rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
        >
          Try again
        </button>
      </section>
    );
  }

  // ---- ANSWERING ----
  const showingExplanation = currentPick !== null;
  const isCorrect = showingExplanation && currentPick === currentItem.tier;

  return (
    <section className="mt-10 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
          ROI quiz
        </h2>
        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          {currentIndex + 1} of {total}
        </span>
      </div>

      <div className="mt-5 rounded-md border border-zinc-200 bg-zinc-50 px-4 py-4 dark:border-zinc-800 dark:bg-zinc-950">
        <p className="text-[15px] font-semibold text-zinc-900 dark:text-zinc-100">
          {currentItem.label}
        </p>
        <p className="mt-1 text-[13px] leading-relaxed text-zinc-600 dark:text-zinc-400">
          {currentItem.spec}
        </p>
      </div>

      {!showingExplanation && (
        <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-3">
          {TIER_OPTIONS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => pick(t)}
              className="rounded-md border border-zinc-300 bg-white px-3 py-2.5 text-sm font-medium text-zinc-900 hover:border-zinc-900 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:border-zinc-100 dark:hover:bg-zinc-800"
            >
              {ROI_TIER_LABEL[t]}
            </button>
          ))}
        </div>
      )}

      {showingExplanation && (
        <div className="mt-5">
          <div
            className={
              isCorrect
                ? 'rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 dark:border-emerald-900 dark:bg-emerald-950'
                : 'rounded-md border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-900 dark:bg-amber-950'
            }
          >
            <p className="text-[13px] font-medium text-zinc-900 dark:text-zinc-100">
              You picked {ROI_TIER_LABEL[currentPick!]}.{' '}
              {isCorrect
                ? 'Same call.'
                : `Mister P calls this ${ROI_TIER_LABEL[currentItem.tier]}.`}
            </p>
            <p className="mt-2 text-[14px] leading-relaxed text-zinc-800 dark:text-zinc-200">
              {currentItem.explanation}
            </p>
          </div>

          <button
            type="button"
            onClick={next}
            className="mt-4 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            {currentIndex + 1 < total ? 'Next' : 'See results'}
          </button>
        </div>
      )}
    </section>
  );
}
