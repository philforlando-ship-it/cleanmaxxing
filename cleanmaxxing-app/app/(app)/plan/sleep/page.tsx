// /plan/sleep — Pattern A fourth topic, v0. First topic to ingest live
// data: the report generator pulls last-7-night rolling avg from
// sleep_logs and surfaces it in the report itself.
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
import { getSleepAssessment, getSleepState } from '@/lib/sleep/service';
import { listActiveCommitments } from '@/lib/sleep/commitments';
import { explainCommitment } from '@/lib/sleep/explainers';
import { getMostRecentWeeklyReview } from '@/lib/sleep/weekly-review';
import { WhyThis } from '@/components/why-this';
import type { SleepAssessment } from '@/lib/sleep/types';
import {
  SleepAssessmentForm,
  type SleepAssessmentInitialValues,
} from './assessment-form';
import { SleepWeeklyReviewPanel } from './weekly-review-panel';
import { ConsiderOtcCard } from './consider-otc-card';
import { ApneaScreeningCard } from './apnea-screening-card';
import { SleepDeficitCard } from './sleep-deficit-card';
import { detectSleepDeficit7d } from '@/lib/contextual-prompt/prompts';

type Props = {
  searchParams: Promise<{ edit?: string }>;
};

export default async function SleepPlanPage({ searchParams }: Props) {
  const params = await searchParams;
  const editParam = params.edit === '1';

  const user = await getUser();
  if (!user) redirect('/login');
  const supabase = await createClient();

  // Pull assessment + sleep state + active commitments + most-recent
  // weekly review in parallel. SleepState powers the pre-form data
  // preview. Commitments + review render below the report.
  const [assessment, sleepState, commitments, mostRecentReview] =
    await Promise.all([
      getSleepAssessment(supabase, user.id),
      getSleepState(supabase, user.id),
      listActiveCommitments(supabase, user.id),
      getMostRecentWeeklyReview(supabase, user.id),
    ]);
  const hasReport = assessment?.report_text != null;
  const showForm = !assessment || !hasReport || editParam;

  // C2 deficit-card gating. Reuse the same detector that drives
  // /today's contextual prompt so the two surfaces agree on when
  // the floor has dropped. sleepState.recent is the last 14 nights
  // oldest-first; slice the most-recent 7 and feed the hours array.
  const recentSeven = sleepState.recent.slice(-7);
  const deficitResult = detectSleepDeficit7d({
    recentTotalHours: recentSeven.map((r) => r.hours),
  });

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
          Your sleep plan
        </h1>
        {!assessment && (
          <p className="mt-3 text-[15px] leading-relaxed text-zinc-700 dark:text-zinc-300">
            Four short questions about your sleep concern, what you think
            is blocking it, and what you&rsquo;ve already tried. Mister P
            writes you a short, specific plan — using your last seven
            logged nights as context.
          </p>
        )}
        {assessment && editParam && hasReport && (
          <p className="mt-3 text-[15px] leading-relaxed text-zinc-700 dark:text-zinc-300">
            Edit your answers and submit. Mister P will rewrite the plan
            with the new inputs and your latest seven-night data.
          </p>
        )}
        {assessment && hasReport && !editParam && (
          <p className="mt-3 text-[15px] leading-relaxed text-zinc-700 dark:text-zinc-300">
            Sleep changes show up over weeks, not days. Do the next move
            and come back when something shifts.
          </p>
        )}
      </header>

      {/* Pre-form data preview — only shown when there's no plan yet AND
          the user has logged at least one night. Honest about whether
          the data signal will be load-bearing. */}
      {!assessment && sleepState.rollingCount > 0 && (
        <section className="mt-6 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
            What Mister P will see when writing your plan
          </h2>
          <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 text-[13px]">
            <DataRow label="Rolling avg (last 7 nights)">
              {sleepState.rollingAvgHours !== null
                ? `${sleepState.rollingAvgHours} hours`
                : '—'}
            </DataRow>
            <DataRow label="Rolling avg quality">
              {sleepState.rollingAvgQuality !== null
                ? `${sleepState.rollingAvgQuality} / 5`
                : '—'}
            </DataRow>
            <DataRow label="Logged nights in window">
              {sleepState.rollingCount}
            </DataRow>
          </dl>
          {sleepState.rollingCount < 3 && (
            <p className="mt-3 text-[12px] text-zinc-500 dark:text-zinc-400">
              Fewer than three nights logged — the plan will lean on your
              self-report rather than the data signal.
            </p>
          )}
        </section>
      )}

      {assessment && !hasReport && (
        <p className="mt-8 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
          Mister P couldn&rsquo;t finish your plan last time. Submit again
          and we&rsquo;ll try once more.
        </p>
      )}

      {showForm && (
        <section className={assessment && !hasReport ? 'mt-4' : 'mt-8'}>
          <SleepAssessmentForm
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

          {/* C2: deficit diagnostic surface. Fires when the same
              detector behind /today's sleep_deficit_7d prompt is
              firing AND the user has selected blockers — gives a
              single place to see all the per-blocker tailored moves
              alongside the current avg. Quiet when sleep is fine. */}
          {deficitResult.fires && (
            <SleepDeficitCard
              avgHours={deficitResult.avgHours}
              severity={deficitResult.severity}
              blockers={assessment.biggest_blockers}
              loggedNights={recentSeven.length}
            />
          )}

          {/* Behavioral baseline → OTC supplements gate. Shows when
              4+ weeks since the report AND the rolling sleep avg is
              below 7h AND the user hasn't already acknowledged the
              OTC layer. */}
          {!assessment.otc_supplements_considered_at &&
            sleepState.rollingAvgHours !== null &&
            sleepState.rollingAvgHours < 7 &&
            sleepState.rollingCount >= 4 &&
            (() => {
              const weeks = Math.floor(
                (Date.now() -
                  new Date(assessment.report_generated_at!).getTime()) /
                  (7 * 24 * 60 * 60 * 1000),
              );
              return weeks >= 4 ? (
                <ConsiderOtcCard
                  weeksSinceReport={weeks}
                  rollingAvgHours={sleepState.rollingAvgHours}
                />
              ) : null;
            })()}

          {/* Apnea screening gate. Surfaces 4+ weeks after the user
              acknowledged the OTC supplement layer if rolling sleep
              avg is still poor (< 7h with 4+ logged nights) AND the
              screening hasn't already been surfaced. */}
          {assessment.otc_supplements_considered_at &&
            !assessment.apnea_screening_surfaced_at &&
            sleepState.rollingAvgHours !== null &&
            sleepState.rollingAvgHours < 7 &&
            sleepState.rollingCount >= 4 &&
            (() => {
              const weeks = Math.floor(
                (Date.now() -
                  new Date(assessment.otc_supplements_considered_at).getTime()) /
                  (7 * 24 * 60 * 60 * 1000),
              );
              return weeks >= 4 ? (
                <ApneaScreeningCard
                  weeksSinceOtcAck={weeks}
                  rollingAvgHours={sleepState.rollingAvgHours}
                />
              ) : null;
            })()}

          {commitments.length > 0 && (
            <section className="mt-10 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
              <h2 className="text-base font-medium text-zinc-900 dark:text-zinc-100">
                Daily commitments
              </h2>
              <p className="mt-1 text-[13px] leading-relaxed text-zinc-600 dark:text-zinc-400">
                Derived from your blockers and what you&rsquo;ve already
                tried. The /today tile checks them off each day. Edit your
                answers to change the list.
              </p>
              <ul className="mt-3 ml-5 list-disc space-y-2 text-[14px] leading-relaxed text-zinc-800 dark:text-zinc-200">
                {commitments.map((c) => (
                  <li key={c.id}>
                    {c.text}
                    <WhyThis
                      lines={explainCommitment(c.source_key)}
                      label="Why this commitment?"
                    />
                  </li>
                ))}
              </ul>
            </section>
          )}

          <SleepWeeklyReviewPanel
            initialReview={
              mostRecentReview
                ? {
                    id: mostRecentReview.id,
                    week_start_app_day:
                      mostRecentReview.week_start_app_day,
                    week_end_app_day: mostRecentReview.week_end_app_day,
                    review_text: mostRecentReview.review_text,
                    generated_at: mostRecentReview.generated_at,
                  }
                : null
            }
          />

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
              href="/plan/sleep?edit=1"
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

function DataRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
        {label}
      </dt>
      <dd className="text-zinc-800 dark:text-zinc-200">{children}</dd>
    </div>
  );
}

function assessmentToInitialValues(
  a: SleepAssessment,
): SleepAssessmentInitialValues {
  return {
    primary_concerns: a.primary_concerns,
    biggest_blockers: a.biggest_blockers,
    schedule_consistency: a.schedule_consistency,
    what_tried: a.what_tried,
    sleep_goal_text: a.sleep_goal_text,
  };
}
