'use client';

// Alcohol & the day after quiz card on /plan/nutrition. Same state
// machine as the Style ROI quiz: idle → answering → answering-with-
// explanation → done. Fixed tier set (smart / workable / costly).
//
// Teaching is in the explanations, not the score — score is just the
// hook. No persistence; state lives in component memory.

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  ALCOHOL_QUIZ_CLOSING_PRINCIPLES,
  ALCOHOL_QUIZ_ITEMS,
  ALCOHOL_TIER_LABEL,
  type AlcoholQuizTier,
} from '@/lib/nutrition/alcohol-quiz-content';

type Answer = {
  item_id: string;
  picked: AlcoholQuizTier;
  correct: boolean;
};

const TIER_OPTIONS: ReadonlyArray<AlcoholQuizTier> = [
  'smart',
  'workable',
  'costly',
];

export function AlcoholQuizCard() {
  const [started, setStarted] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentPick, setCurrentPick] = useState<AlcoholQuizTier | null>(null);
  const [answers, setAnswers] = useState<ReadonlyArray<Answer>>([]);

  const total = ALCOHOL_QUIZ_ITEMS.length;
  const currentItem = ALCOHOL_QUIZ_ITEMS[currentIndex];
  const isDone = started && currentIndex >= total;

  function start() {
    setStarted(true);
    setCurrentIndex(0);
    setCurrentPick(null);
    setAnswers([]);
  }

  function pick(tier: AlcoholQuizTier) {
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
          Alcohol &amp; the day after — smart, workable, or costly?
        </h2>
        <p className="mt-2 text-[14px] leading-relaxed text-zinc-700 dark:text-zinc-300">
          {total}{' '}drinking scenarios. For each, call whether
          Mister&nbsp;P would say smart, workable, or costly. The
          score isn&rsquo;t the point — the mechanism in each call
          is. Sleep architecture, calorie efficiency, the
          binge-cycle math, the two-drink threshold.
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
          Alcohol quiz — done
        </h2>
        <p className="mt-2 text-[14px] leading-relaxed text-zinc-700 dark:text-zinc-300">
          You called {correctCount}{' '}of {total}{' '}the way Mister P would.
          The score isn&rsquo;t the point. The principles below are.
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
            {ALCOHOL_QUIZ_CLOSING_PRINCIPLES}
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
          Alcohol &amp; the day after
        </h2>
        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          {currentIndex + 1}{' '}of {total}
        </span>
      </div>

      <div className="mt-5 rounded-md border border-zinc-200 bg-zinc-50 px-4 py-4 dark:border-zinc-800 dark:bg-zinc-950">
        <p className="text-[15px] font-semibold text-zinc-900 dark:text-zinc-100">
          {currentItem.scenario}
        </p>
        <p className="mt-1 text-[13px] leading-relaxed text-zinc-600 dark:text-zinc-400">
          {currentItem.context}
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
              {ALCOHOL_TIER_LABEL[t]}
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
              You picked {ALCOHOL_TIER_LABEL[currentPick!]}.{' '}
              {isCorrect
                ? 'Same call.'
                : `Mister P calls this ${ALCOHOL_TIER_LABEL[currentItem.tier]}.`}
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
