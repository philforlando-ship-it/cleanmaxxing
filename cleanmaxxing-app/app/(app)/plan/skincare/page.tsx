// /plan/skincare — Pattern A fifth topic, v0.
//
// Same four states as the other Pattern A v0 plans:
//   1. No assessment yet                    → render the assessment form
//   2. Assessment, no report                → form pre-populated + warning
//   3. Report present, ?edit=1              → form pre-populated for edit
//   4. Report present, no edit param        → render the report

import Link from 'next/link';
import { redirect } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { createClient, getUser } from '@/lib/supabase/server';
import { getSkincareAssessment } from '@/lib/skincare/service';
import type { SkincareAssessment } from '@/lib/skincare/types';
import {
  SkincareAssessmentForm,
  type SkincareAssessmentInitialValues,
} from './assessment-form';
import { BaselineFloorCard } from './baseline-floor-card';
import { StartRetinoidCard } from './start-retinoid-card';
import { StepUpCard } from './step-up-card';

// Users whose current_routine at assessment is one of these are
// treated as floor-already-established without needing the
// BaselineFloorCard gate. The card surfaces only for users who
// said they have nothing or cleanser-only at assessment time.
const ROUTINE_BELOW_FLOOR: ReadonlyArray<string> = ['none', 'cleanser_only'];

type Props = {
  searchParams: Promise<{ edit?: string }>;
};

export default async function SkincarePlanPage({ searchParams }: Props) {
  const params = await searchParams;
  const editParam = params.edit === '1';

  const user = await getUser();
  if (!user) redirect('/login');
  const supabase = await createClient();

  const assessment = await getSkincareAssessment(supabase, user.id);
  const hasReport = assessment?.report_text != null;
  const showForm = !assessment || !hasReport || editParam;

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <Link
        href="/today"
        className="text-xs text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
      >
        ← Back to Today
      </Link>

      <header className="mt-6">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
          Your skincare plan
        </h1>
        {!assessment && (
          <p className="mt-3 text-[15px] leading-relaxed text-zinc-700 dark:text-zinc-300">
            Four short questions about what your skin does, what you want to
            address, and what you&rsquo;re currently doing about it. Mister
            P writes you a short, specific plan — no brand SKUs, just the
            move that matters this week.
          </p>
        )}
        {assessment && editParam && hasReport && (
          <p className="mt-3 text-[15px] leading-relaxed text-zinc-700 dark:text-zinc-300">
            Edit your answers and submit. Mister P will rewrite the plan
            with the new inputs.
          </p>
        )}
        {assessment && hasReport && !editParam && (
          <p className="mt-3 text-[15px] leading-relaxed text-zinc-700 dark:text-zinc-300">
            Skincare changes show up over weeks to months. Stick to the
            move, give it time, come back when something shifts.
          </p>
        )}
      </header>

      {assessment && !hasReport && (
        <p className="mt-8 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
          Mister P couldn&rsquo;t finish your plan last time. Submit again
          and we&rsquo;ll try once more.
        </p>
      )}

      {showForm && (
        <section className={assessment && !hasReport ? 'mt-4' : 'mt-8'}>
          <SkincareAssessmentForm
            initialValues={
              assessment ? assessmentToInitialValues(assessment) : undefined
            }
          />
        </section>
      )}

      {!showForm && assessment && hasReport && (
        <article className="mt-8">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              h2: ({ children }) => (
                <h2 className="mt-10 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                  {children}
                </h2>
              ),
              h3: ({ children }) => (
                <h3 className="mt-8 text-base font-semibold text-zinc-900 dark:text-zinc-100">
                  {children}
                </h3>
              ),
              p: ({ children }) => (
                <p className="mt-3 text-[15px] leading-relaxed text-zinc-800 dark:text-zinc-200">
                  {children}
                </p>
              ),
              strong: ({ children }) => (
                <strong className="font-semibold text-zinc-900 dark:text-zinc-100">
                  {children}
                </strong>
              ),
              ul: ({ children }) => (
                <ul className="mt-3 ml-5 list-disc space-y-1.5 text-[15px] leading-relaxed text-zinc-800 dark:text-zinc-200">
                  {children}
                </ul>
              ),
              ol: ({ children }) => (
                <ol className="mt-3 ml-5 list-decimal space-y-1.5 text-[15px] leading-relaxed text-zinc-800 dark:text-zinc-200">
                  {children}
                </ol>
              ),
              li: ({ children }) => <li className="pl-1">{children}</li>,
            }}
          >
            {assessment.report_text!}
          </ReactMarkdown>

          {/* Baseline-floor stage. Surfaces only for users whose
              current_routine at assessment was 'none' or
              'cleanser_only' AND who haven't yet marked the floor
              established. Gates the retinoid card below — the
              retinoid card requires either a positive baseline
              signal at assessment time (cleanser_moisturizer or
              full_routine) OR an explicit floor-established
              timestamp from this card. */}
          {!assessment.baseline_established_at &&
            ROUTINE_BELOW_FLOOR.includes(assessment.current_routine) && (
              <BaselineFloorCard />
            )}

          {/* Introduce-retinoid stage. Shows for retinoid-relevant
              concerns (acne / aging / uneven_tone) once the baseline
              floor is in place AND it's had time to settle (3+ weeks
              since report) AND the user hasn't already started a
              retinoid. Floor-in-place = either current_routine is
              cleanser_moisturizer/full_routine at assessment OR the
              baseline-established gate has been marked. */}
          {!assessment.retinoid_started_at &&
            (assessment.primary_concern === 'acne' ||
              assessment.primary_concern === 'aging' ||
              assessment.primary_concern === 'uneven_tone') &&
            (assessment.baseline_established_at !== null ||
              !ROUTINE_BELOW_FLOOR.includes(assessment.current_routine)) &&
            (() => {
              const weeks = Math.floor(
                (Date.now() -
                  new Date(assessment.report_generated_at!).getTime()) /
                  (7 * 24 * 60 * 60 * 1000),
              );
              return weeks >= 3 ? (
                <StartRetinoidCard weeksSinceReport={weeks} />
              ) : null;
            })()}

          {/* 12-week step-up gate. Shows for users who've started a
              retinoid AND it's been 12+ weeks since starting OR last
              step-up. */}
          {assessment.retinoid_started_at &&
            (() => {
              const lastTouchMs = Math.max(
                new Date(assessment.retinoid_started_at).getTime(),
                assessment.last_step_up_at
                  ? new Date(assessment.last_step_up_at).getTime()
                  : 0,
              );
              const weeks = Math.floor(
                (Date.now() - lastTouchMs) / (7 * 24 * 60 * 60 * 1000),
              );
              return weeks >= 12 ? (
                <StepUpCard weeksSinceLastTouch={weeks} />
              ) : null;
            })()}

          <footer className="mt-12 flex flex-wrap items-center justify-between gap-3 border-t border-zinc-200 pt-6 text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
            <span>
              Written by Mister P on{' '}
              {new Date(assessment.report_generated_at!).toLocaleDateString(
                undefined,
                { year: 'numeric', month: 'short', day: 'numeric' },
              )}
              .
            </span>
            <Link
              href="/plan/skincare?edit=1"
              className="underline decoration-dotted underline-offset-2 hover:text-zinc-700 dark:hover:text-zinc-200"
            >
              Edit answers
            </Link>
          </footer>
        </article>
      )}
    </main>
  );
}

function assessmentToInitialValues(
  a: SkincareAssessment,
): SkincareAssessmentInitialValues {
  return {
    skin_behavior: a.skin_behavior,
    primary_concern: a.primary_concern,
    current_routine: a.current_routine,
    sun_exposure: a.sun_exposure,
    sensitivity_history: a.sensitivity_history,
    barrier_state: a.barrier_state,
    skincare_goal_text: a.skincare_goal_text,
  };
}
