// /plan/cardio — Pattern A eighth topic, v0. Third leg of the
// fitness trio (nutrition + strength + cardio). Cross-modifier-aware
// of both: the report reads nutrition's goal_direction (cut / recomp
// / bulk) AND strength's days_per_week to keep the cardio
// prescription aligned with the rest of the system.

import Link from 'next/link';
import { redirect } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { createClient, getUser } from '@/lib/supabase/server';
import {
  getCardioAssessment,
  getRecentCardioSessionCount,
} from '@/lib/cardio/service';
import type { CardioAssessment } from '@/lib/cardio/types';
import { hasNutritionAssessment } from '@/lib/nutrition/service';
import { hasStrengthAssessment } from '@/lib/strength/service';
import {
  CardioAssessmentForm,
  type CardioAssessmentInitialValues,
} from './assessment-form';
import { AddZone2Card } from './add-zone-2-card';
import { AddHiitCard } from './add-hiit-card';
import { RecommendedModalitiesPanel } from './recommended-modalities-panel';

type Props = {
  searchParams: Promise<{ edit?: string }>;
};

export default async function CardioPlanPage({ searchParams }: Props) {
  const params = await searchParams;
  const editParam = params.edit === '1';

  const user = await getUser();
  if (!user) redirect('/login');
  const supabase = await createClient();

  // Pull assessment + live session count + cross-modifier presence in
  // parallel. Nutrition + strength presence drive a friendly nudge in
  // the page header pre-form.
  const [
    assessment,
    sessionsLast7,
    nutritionPresence,
    strengthPresence,
    { data: userRow },
  ] = await Promise.all([
    getCardioAssessment(supabase, user.id),
    getRecentCardioSessionCount(supabase, user.id, 7),
    hasNutritionAssessment(supabase, user.id),
    hasStrengthAssessment(supabase, user.id),
    supabase.from('users').select('age').eq('id', user.id).maybeSingle(),
  ]);
  const userAge =
    (userRow as { age: number | null } | null)?.age ?? null;
  const hasReport = assessment?.report_text != null;
  const showForm = !assessment || !hasReport || editParam;
  const missingCrossModifiers =
    !nutritionPresence.hasReport || !strengthPresence.hasReport;

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
          Your cardio plan
        </h1>
        {!assessment && (
          <>
            <p className="mt-3 text-[15px] leading-relaxed text-zinc-700 dark:text-zinc-300">
              Four short questions about why you want cardio, what you do
              now, what modality you tolerate, and how many days you can
              actually train. Mister P writes a specific plan grounded in
              the Zone 2 + HIIT + step count framework — diet drives fat
              loss, cardio is the support tool.
            </p>
            {missingCrossModifiers && (
              <p className="mt-2 text-[13px] text-zinc-500 dark:text-zinc-400">
                Tip: completing your{' '}
                {!nutritionPresence.hasReport && (
                  <>
                    <Link
                      href="/plan/nutrition"
                      className="underline decoration-dotted underline-offset-2"
                    >
                      nutrition plan
                    </Link>
                    {!strengthPresence.hasReport && ' and '}
                  </>
                )}
                {!strengthPresence.hasReport && (
                  <Link
                    href="/plan/strength"
                    className="underline decoration-dotted underline-offset-2"
                  >
                    strength plan
                  </Link>
                )}{' '}
                first lets the cardio prescription stay aligned with the
                rest of the system (cut vs. bulk vs. recomp + lifting
                volume change the cardio dose).
              </p>
            )}
          </>
        )}
        {assessment && editParam && hasReport && (
          <p className="mt-3 text-[15px] leading-relaxed text-zinc-700 dark:text-zinc-300">
            Edit your answers and submit. Mister P will rewrite the plan
            with the new inputs.
          </p>
        )}
        {assessment && hasReport && !editParam && (
          <p className="mt-3 text-[15px] leading-relaxed text-zinc-700 dark:text-zinc-300">
            Cardio adaptation shows up over months. Stay on the protocol,
            give it time, come back when something shifts.
          </p>
        )}
      </header>

      {/* Pre-form data preview — when there's no plan yet AND the user
          has at least one cardio session in the last 7 days. */}
      {!assessment && sessionsLast7 > 0 && (
        <section className="mt-6 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
            What Mister P will see when writing your plan
          </h2>
          <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 text-[13px]">
            <DataRow label="Cardio sessions (last 7 days)">
              {sessionsLast7}
            </DataRow>
          </dl>
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
          <CardioAssessmentForm
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

          {/* NEAT → Zone 2 transition gate. Shows for users who picked
              '0_days' (step count only) and haven't already advanced. */}
          {assessment.days_per_week === '0_days' &&
            !assessment.zone_2_layer_started_at &&
            (() => {
              const weeks = Math.floor(
                (Date.now() -
                  new Date(assessment.report_generated_at!).getTime()) /
                  (7 * 24 * 60 * 60 * 1000),
              );
              return weeks >= 3 ? (
                <AddZone2Card weeksSinceReport={weeks} />
              ) : null;
            })()}

          {/* Recommended-modalities panel — ranks the 7 modalities
              for the user based on equipment / outdoor / time /
              injury. Read-only; informational. Does NOT render
              when screening fields are missing (pre-migration
              assessments — Edit answers to populate). */}
          <RecommendedModalitiesPanel
            equipment_access={assessment.equipment_access}
            outdoor_access={assessment.outdoor_access}
            time_per_session={assessment.time_per_session}
            injury_constraints={assessment.injury_constraints}
            current_preference={assessment.modality_preference}
          />

          {/* Add HIIT layer gate. Shows when user has structured Zone 2
              in place (either picked '1_2_days'+ originally OR went
              through the NEAT→Zone 2 gate) AND hasn't yet added HIIT.
              Counts weeks from zone_2_layer_started_at if present,
              otherwise from report_generated_at. */}
          {assessment.days_per_week !== '0_days' &&
            !assessment.hiit_layer_started_at &&
            (() => {
              const baseStartMs = assessment.zone_2_layer_started_at
                ? new Date(assessment.zone_2_layer_started_at).getTime()
                : new Date(assessment.report_generated_at!).getTime();
              const weeks = Math.floor(
                (Date.now() - baseStartMs) / (7 * 24 * 60 * 60 * 1000),
              );
              return weeks >= 6 ? (
                <AddHiitCard weeksOnZone2Base={weeks} age={userAge} />
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
              href="/plan/cardio?edit=1"
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
  a: CardioAssessment,
): CardioAssessmentInitialValues {
  return {
    primary_role: a.primary_role,
    current_movement: a.current_movement,
    modality_preference: a.modality_preference,
    days_per_week: a.days_per_week,
    cardio_goal_text: a.cardio_goal_text,
    injury_constraints: a.injury_constraints,
    equipment_access: a.equipment_access,
    outdoor_access: a.outdoor_access,
    time_per_session: a.time_per_session,
    occupation_activity: a.occupation_activity,
  };
}
