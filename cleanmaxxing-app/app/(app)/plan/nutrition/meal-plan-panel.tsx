'use client';

// Meal plan panel — generates and displays a 7-day meal plan
// (3 meals + snacks per day) anchored on the user's calorie + macro
// targets. Mirrors the sleep weekly review pattern: idempotent for
// the current week (regen overwrites the same row).

import { useState, useTransition } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

type PlanSummary = {
  id: string;
  week_start_app_day: string;
  week_end_app_day: string;
  plan_text: string;
  generated_at: string;
};

type Props = {
  initialPlan: PlanSummary | null;
  // Optional surface — true if the assessment has computed targets.
  // When false, the panel still works (the LLM falls back) but the
  // hint copy nudges the user toward profile completion.
  hasComputedTargets: boolean;
};

export function MealPlanPanel({ initialPlan, hasComputedTargets }: Props) {
  const [plan, setPlan] = useState<PlanSummary | null>(initialPlan);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function generate() {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch('/api/plan/nutrition/meal-plan/generate', {
          method: 'POST',
        });
        const body = (await res.json().catch(() => ({}))) as {
          error?: string;
          message?: string;
          plan?: PlanSummary;
        };
        if (!res.ok) {
          throw new Error(
            body.message ?? body.error ?? `Request failed (${res.status})`,
          );
        }
        if (body.plan) setPlan(body.plan);
      } catch (err) {
        setError((err as Error).message);
      }
    });
  }

  return (
    <section className="mt-8 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="text-base font-medium text-zinc-900 dark:text-zinc-100">
          7-day meal plan
        </h2>
        <button
          type="button"
          onClick={generate}
          disabled={pending}
          className="text-xs text-zinc-700 underline decoration-dotted underline-offset-2 hover:text-zinc-900 disabled:opacity-50 dark:text-zinc-300 dark:hover:text-zinc-100"
        >
          {pending
            ? 'Mister P is writing your meal plan…'
            : plan
              ? 'Re-roll'
              : 'Generate this week'}
        </button>
      </div>
      <p className="mt-1 text-[12px] text-zinc-500 dark:text-zinc-400">
        Built off your calorie + macro targets, fasting protocol, and food
        picks. Idempotent for the current week — re-rolling overwrites the
        existing plan. Generation runs ~15-30 seconds.
      </p>
      {!hasComputedTargets && (
        <p className="mt-2 text-[12px] text-amber-700 dark:text-amber-400">
          Heads up: your TDEE / macro targets aren&rsquo;t computed yet
          (profile is missing weight, height, age, or activity level).
          Mister P will fall back to qualitative guidance — the meal plan
          will be less specific. Add the missing info on /profile for
          tighter numbers.
        </p>
      )}

      {error && (
        <p className="mt-3 text-[12px] text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      {plan ? (
        <article className="mt-4 rounded-md border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950/40">
          <p className="text-[11px] uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            {formatRange(plan.week_start_app_day, plan.week_end_app_day)}
            {' · '}generated{' '}
            {new Date(plan.generated_at).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
            })}
          </p>
          <div className="mt-2">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                h1: ({ children }) => (
                  <h3 className="text-[15px] font-semibold text-zinc-900 dark:text-zinc-100">
                    {children}
                  </h3>
                ),
                h2: ({ children }) => (
                  <h4 className="mt-5 text-[14px] font-semibold text-zinc-900 first:mt-0 dark:text-zinc-100">
                    {children}
                  </h4>
                ),
                h3: ({ children }) => (
                  <h5 className="mt-3 text-[13px] font-semibold text-zinc-900 dark:text-zinc-100">
                    {children}
                  </h5>
                ),
                p: ({ children }) => (
                  <p className="mt-1.5 text-[13px] leading-relaxed text-zinc-800 dark:text-zinc-200">
                    {children}
                  </p>
                ),
                strong: ({ children }) => (
                  <strong className="font-semibold text-zinc-900 dark:text-zinc-100">
                    {children}
                  </strong>
                ),
                ul: ({ children }) => (
                  <ul className="mt-1 ml-5 list-disc space-y-0.5 text-[13px] leading-relaxed text-zinc-800 dark:text-zinc-200">
                    {children}
                  </ul>
                ),
                li: ({ children }) => <li className="pl-1">{children}</li>,
                hr: () => (
                  <hr className="my-4 border-zinc-200 dark:border-zinc-700" />
                ),
              }}
            >
              {plan.plan_text}
            </ReactMarkdown>
          </div>
        </article>
      ) : (
        <p className="mt-3 text-[13px] text-zinc-600 dark:text-zinc-400">
          No meal plan generated yet. Click &ldquo;Generate this week&rdquo;
          to build one from your targets and food picks.
        </p>
      )}
    </section>
  );
}

function formatRange(startAppDay: string, endAppDay: string): string {
  const fmt = (d: string) =>
    new Date(d + 'T00:00:00Z').toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    });
  return `${fmt(startAppDay)} – ${fmt(endAppDay)}`;
}
