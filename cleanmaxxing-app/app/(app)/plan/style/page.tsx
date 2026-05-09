// /plan/style — Pattern A second topic, v0.
//
// Same four states as /plan/hair v0:
//   1. No assessment yet                    → render the assessment form
//   2. Assessment, no report                → form pre-populated + warning
//   3. Report present, ?edit=1              → form pre-populated for edit
//   4. Report present, no edit param        → render the report
//
// "plan" not "journey" in URL and headings — Mister P never uses that
// word in user-facing copy.

import Link from 'next/link';
import { redirect } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { createClient } from '@/lib/supabase/server';
import {
  getStyleAssessment,
  isStyleReportStale,
} from '@/lib/style/service';
import { computeArchetypeFeasibility } from '@/lib/style/aesthetic-feasibility';
import { getUserProfile } from '@/lib/profile/service';
import { chipsForArchetype } from '@/lib/style/closet-audit-content';
import { foundationPiecesFor } from '@/lib/style/foundation-pieces-content';
import { fitPrinciplesFor } from '@/lib/style/fit-calibration-content';
import type { StyleAssessment } from '@/lib/style/types';
import {
  StyleAssessmentForm,
  type StyleAssessmentInitialValues,
} from './assessment-form';
import { BodyAxesPanel } from './body-axes-panel';
import { StyleStage1Card } from './stage-1-card';
import { StyleStage2Card } from './stage-2-card';
import { StyleStage3Card } from './stage-3-card';

type Props = {
  searchParams: Promise<{ edit?: string }>;
};

export default async function StylePlanPage({ searchParams }: Props) {
  const params = await searchParams;
  const editParam = params.edit === '1';

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const assessment = await getStyleAssessment(supabase, user.id);
  const hasReport = assessment?.report_text != null;
  const showForm = !assessment || !hasReport || editParam;

  // Profile + age fetched once and threaded into every modifier-aware
  // surface (staleness banner, Stage 2 piece guidance, Stage 3
  // principles).
  const [profile, userRow] = await Promise.all([
    getUserProfile(supabase, user.id),
    supabase.from('users').select('age').eq('id', user.id).maybeSingle(),
  ]);
  const age =
    (userRow.data as { age: number | null } | null)?.age ?? null;
  const ageCohort: 'young' | 'mature' = age != null && age >= 45 ? 'mature' : 'young';

  const stalenessReasons =
    assessment && hasReport
      ? isStyleReportStale(assessment.report_input_modifiers, {
          bf_pct_self_estimate: profile.bf_pct_self_estimate,
          budget_tier: profile.budget_tier,
          current_interventions: profile.current_interventions,
          age,
        })
      : [];

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
          Your style plan
        </h1>
        {!assessment && (
          <p className="mt-3 text-[15px] leading-relaxed text-zinc-700 dark:text-zinc-300">
            Four quick questions about your frame, the archetype you&rsquo;re
            currently dressing as, and the one you&rsquo;re moving toward.
            Mister P writes you a short, specific plan from there.
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
            Style holds its value when you stay in one register and
            iterate. Read the plan, do the next move, come back when
            something shifts.
          </p>
        )}
      </header>

      {assessment && !hasReport && (
        <p className="mt-8 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
          Mister P couldn&rsquo;t finish your plan last time. Submit again
          and we&rsquo;ll try once more.
        </p>
      )}

      {showForm && (() => {
        // Style v2 Phase 2b — compute per-user feasibility from
        // existing assessment dims when available, plus user_profile
        // height + age. Form Q7 surfaces the per-archetype tier so
        // the user sees which aesthetics fight their frame before
        // committing.
        const feasibility = computeArchetypeFeasibility({
          shoulder_width: assessment?.shoulder_width ?? null,
          build: assessment?.build ?? null,
          height_inches: profile.height_inches,
          age,
        });
        return (
          <section className={assessment && !hasReport ? 'mt-4' : 'mt-8'}>
            <StyleAssessmentForm
              initialValues={
                assessment ? assessmentToInitialValues(assessment) : undefined
              }
              feasibility={feasibility}
            />
          </section>
        );
      })()}

      {!showForm && assessment && hasReport && stalenessReasons.length > 0 && (
        <aside className="mt-8 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
          {stalenessReasons.includes('bf_drift_silhouette') ? (
            <>
              <p className="font-medium">
                Your style was tuned for a different body comp.
              </p>
              <p className="mt-1 leading-relaxed">
                Your body fat has shifted enough that the silhouette
                rules and archetype-feasibility read would land
                differently now. Re-submit your answers and Mister P
                will rewrite the plan against your current body.{' '}
                <Link
                  href="/plan/style?edit=1"
                  className="underline decoration-dotted underline-offset-2"
                >
                  Edit answers
                </Link>
                .
              </p>
            </>
          ) : (
            <>
              <p className="font-medium">Your plan is out of date.</p>
              <p className="mt-1 leading-relaxed">
                This plan was written before some of your inputs changed.
                Re-submit your answers and Mister P will rewrite it.{' '}
                <Link
                  href="/plan/style?edit=1"
                  className="underline decoration-dotted underline-offset-2"
                >
                  Edit answers
                </Link>
                .
              </p>
            </>
          )}
        </aside>
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
              href="/plan/style?edit=1"
              className="underline decoration-dotted underline-offset-2 hover:text-zinc-700 dark:hover:text-zinc-200"
            >
              Edit answers
            </Link>
          </footer>
        </article>
      )}

      {!showForm && assessment && hasReport && (
        <>
          <BodyAxesPanel
            legLength={assessment.leg_length}
            armLength={assessment.arm_length}
            skinUndertone={assessment.skin_undertone}
          />

          <StyleStage1Card
            targetArchetype={assessment.target_archetype}
            ageCohort={ageCohort}
            chips={chipsForArchetype(assessment.target_archetype)}
            existingSelections={assessment.stage_1_chip_selections}
            auditText={assessment.stage_1_audit_text}
            generatedAt={assessment.stage_1_generated_at}
            completedAt={assessment.stage_1_completed_at}
          />

          {assessment.stage_1_completed_at && (
            <StyleStage2Card
              pieces={foundationPiecesFor({
                archetype: assessment.target_archetype,
                frame: assessment.frame_estimate,
                budget: profile.budget_tier,
                bf_pct: profile.bf_pct_self_estimate,
                age,
                leg_length: assessment.leg_length,
                arm_length: assessment.arm_length,
                skin_undertone: assessment.skin_undertone,
              })}
              initialAcquired={assessment.stage_2_pieces_acquired}
              completedAt={assessment.stage_2_completed_at}
            />
          )}

          {assessment.stage_2_completed_at && (
            <StyleStage3Card
              principles={fitPrinciplesFor({
                archetype: assessment.target_archetype,
                frame: assessment.frame_estimate,
                bf_pct: profile.bf_pct_self_estimate,
                age,
              })}
              acknowledgedAt={assessment.stage_3_acknowledged_at}
            />
          )}
        </>
      )}
    </main>
  );
}

function assessmentToInitialValues(
  a: StyleAssessment,
): StyleAssessmentInitialValues {
  return {
    shoulder_width: a.shoulder_width,
    arm_length: a.arm_length,
    leg_length: a.leg_length,
    build: a.build,
    skin_undertone: a.skin_undertone,
    current_archetype: a.current_archetype,
    target_archetype: a.target_archetype,
    closet_state: a.closet_state,
    style_goal_text: a.style_goal_text,
  };
}
