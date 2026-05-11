// /plan/facial-structure — Pattern A v1 surface, ninth journey.
//
// Four states (same shape as hair / style / skincare):
//   1. No assessment yet → render the assessment form
//   2. Assessment, no report → render the form with a "previous attempt
//      failed" warning. Re-submit regenerates.
//   3. Report present, ?edit=1 → render the form pre-populated
//   4. Report present, no edit param → render the report with an "Edit
//      answers" link
//
// Stage cards (Stages 1-4) are NOT shipped in Slice 2 — the report
// itself is sufficient for v1. Stage cards land in Slice 3, after we
// see what users actually do with the report.

import Link from 'next/link';
import { redirect } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { createClient, getUser } from '@/lib/supabase/server';
import { getFacialStructureAssessment } from '@/lib/facial-structure/service';
import type { FacialStructureAssessment } from '@/lib/facial-structure/types';
import { getJourneyPhase } from '@/lib/journey-state/read';
import { getMaintenanceContent } from '@/lib/journey-state/maintenance-content';
import { MaintenanceView } from '@/components/journey/maintenance-view';
import {
  FacialStructureAssessmentForm,
  type FacialStructureAssessmentInitialValues,
} from './assessment-form';
import {
  computePrimaryLever,
  resolvePrimaryLever,
} from '@/lib/facial-structure/primary-lever';
import {
  FacialStructureStage1Card,
  FacialStructureStage2Card,
  FacialStructureStage3Card,
  FacialStructureStage4Card,
} from './stage-cards';

type Props = {
  searchParams: Promise<{ edit?: string }>;
};

export default async function FacialStructurePlanPage({ searchParams }: Props) {
  const params = await searchParams;
  const editParam = params.edit === '1';

  const user = await getUser();
  if (!user) redirect('/login');
  const supabase = await createClient();

  const [assessment, journeyState] = await Promise.all([
    getFacialStructureAssessment(supabase, user.id),
    getJourneyPhase(supabase, user.id, 'facial_structure'),
  ]);
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
          Your facial structure plan
        </h1>
        {!assessment && (
          <p className="mt-3 text-[15px] leading-relaxed text-zinc-700 dark:text-zinc-300">
            Six short questions about your body fat, distribution, posture,
            chin / jaw concern, and openness to procedures. Mister P writes
            you a short, specific plan anchored on a single primary lever —
            no looksmaxxing tier-lists, no shaming.
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
            Facial structure changes show up over months. Do the next
            lever, give it time, come back when something shifts.
          </p>
        )}
      </header>

      {assessment && !hasReport && (
        <p className="mt-8 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
          Mister P couldn&rsquo;t finish your plan last time. Submit again
          and we&rsquo;ll try once more.
        </p>
      )}

      {journeyState && journeyState.phase !== 'implementing' && (
        <div className="mt-8">
          <MaintenanceView
            phase={journeyState.phase}
            enteredAt={journeyState.entered_at}
            content={getMaintenanceContent('facial_structure')}
          />
        </div>
      )}

      {showForm && (
        <section className={assessment && !hasReport ? 'mt-4' : 'mt-8'}>
          <FacialStructureAssessmentForm
            initialValues={
              assessment ? assessmentToInitialValues(assessment) : undefined
            }
            cancelHref={
              editParam && hasReport ? '/plan/facial-structure' : undefined
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
              href="/plan/facial-structure?edit=1"
              className="underline decoration-dotted underline-offset-2 hover:text-zinc-700 dark:hover:text-zinc-200"
            >
              Edit answers
            </Link>
          </footer>

          {(() => {
            const computed = computePrimaryLever(assessment);
            const resolved = resolvePrimaryLever(assessment);
            return (
              <>
                <FacialStructureStage1Card
                  computedLever={computed}
                  overrideLever={assessment.primary_lever_override}
                  resolvedLever={resolved}
                  acknowledgedAt={assessment.stage_1_acknowledged_at}
                />
                <FacialStructureStage2Card
                  primaryLever={resolved}
                  stage1Ack={assessment.stage_1_acknowledged_at}
                  stage2Started={assessment.stage_2_started_at}
                  stage2Completed={assessment.stage_2_completed_at}
                />
                <FacialStructureStage3Card
                  primaryLever={resolved}
                  stage2Completed={assessment.stage_2_completed_at}
                  stage3Ack={assessment.stage_3_acknowledged_at}
                />
                <FacialStructureStage4Card
                  stage4UnlockedAt={assessment.stage_4_unlocked_at}
                  stage4Ack={assessment.stage_4_acknowledged_at}
                />
              </>
            );
          })()}
        </article>
      )}
    </main>
  );
}

function assessmentToInitialValues(
  a: FacialStructureAssessment,
): FacialStructureAssessmentInitialValues {
  return {
    body_fat_estimate: a.body_fat_estimate,
    face_first_distribution: a.face_first_distribution,
    postural_pattern: a.postural_pattern,
    chin_jaw_concern: a.chin_jaw_concern,
    facial_puff_baseline: a.facial_puff_baseline,
    cosmetic_procedure_openness: a.cosmetic_procedure_openness,
    notes: a.notes,
  };
}
