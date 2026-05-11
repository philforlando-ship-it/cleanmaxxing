// /plan/hair — the user-facing hair plan surface.
//
// Four states:
//   1. No assessment yet                    → render the assessment form
//   2. Assessment, no report                → render the form pre-populated
//                                              with a "previous attempt
//                                              failed" warning. Re-submit
//                                              regenerates.
//   3. Report present, ?edit=1              → render the form pre-populated
//                                              for the user to change answers
//   4. Report present, no edit param        → render the report with an
//                                              "Edit answers" link
//
// "plan" not "journey" in the URL and headings — Mister P never uses
// the word "journey" in user-facing copy. See lib/mister-p/prompt.ts.

import Link from 'next/link';
import { redirect } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { createClient, getUser } from '@/lib/supabase/server';
import { getHairAssessment, getStage4State } from '@/lib/hair/service';
import { getMostRecentTryOnForCut } from '@/lib/hair/try-on/service';
import {
  listActiveInterventions,
  listEventsForInterventions,
} from '@/lib/interventions/service';
import { getUserProfile } from '@/lib/profile/service';
import { getPremiumStatus } from '@/lib/billing/is-premium';
import { appDayFor } from '@/lib/date/app-day';
import type { HairAssessment } from '@/lib/hair/types';
import {
  HairAssessmentForm,
  type HairAssessmentInitialValues,
} from './assessment-form';
import { HairStage1Card } from './stage-1-card';
import { HairProductQuizCard } from './product-quiz-card';
import { HairStage2Card } from './stage-2-card';
import { HairStage3Card } from './stage-3-card';
import { HairStage4Card } from './stage-4-card';
import { HairStage5Card } from './stage-5-card';
import { HairStage6Card } from './stage-6-card';
import { PatternDConsideringCard } from './pattern-d-considering-card';
import { RemediesConsideringCard } from './remedies-considering-card';

type Props = {
  searchParams: Promise<{ edit?: string }>;
};

export default async function HairPlanPage({ searchParams }: Props) {
  const params = await searchParams;
  const editParam = params.edit === '1';

  const user = await getUser();
  if (!user) redirect('/login');
  const supabase = await createClient();

  // Pull the assessment + the modifier-source profile fields in parallel.
  // Stage 2 reads current_interventions to pre-suggest a path
  // (fin/min present → "treat" already happening in real life).
  // Also pull the user's timezone so Stage 4's "today logged" check
  // uses the user's app-day, not server-local midnight.
  // Baseline-photo lookup powers the face-shape auto-detect button on
  // the assessment form — only renders the button when a row exists.
  const [
    assessment,
    profile,
    { data: userRow },
    { data: baselinePhotoRow },
    premium,
    { data: ageFeelRow },
  ] = await Promise.all([
    getHairAssessment(supabase, user.id),
    getUserProfile(supabase, user.id),
    supabase
      .from('users')
      .select('timezone, age')
      .eq('id', user.id)
      .maybeSingle(),
    supabase
      .from('progress_photos')
      .select('id')
      .eq('user_id', user.id)
      .eq('slot', 'baseline')
      .eq('angle', 'front')
      .eq('category', 'face')
      .maybeSingle(),
    getPremiumStatus(user.id),
    supabase
      .from('survey_responses')
      .select('response_value')
      .eq('user_id', user.id)
      .eq('question_key', 'confidence_appearance')
      .maybeSingle(),
  ]);

  // Self-perceived age delta. confidence_appearance is the 2/4/6/8/10
  // age-feel choice from onboarding (6 = "about my age"). Combined
  // with actual age inside HairStage1Card to compute an effective
  // age that drives image-cohort selection.
  const ageFeelRaw = (ageFeelRow as { response_value: string | null } | null)
    ?.response_value;
  const ageFeelValue = ageFeelRaw ? Number(ageFeelRaw) : NaN;
  const ageFeelClean =
    Number.isFinite(ageFeelValue) && ageFeelValue >= 2 && ageFeelValue <= 10
      ? ageFeelValue
      : null;
  const hasBaselinePhoto = baselinePhotoRow !== null;
  const hasReport = assessment?.report_text != null;
  const showForm = !assessment || !hasReport || editParam;

  // Most-recent try-on preview for the user's current Stage 1 cut.
  // Cheap lookup; only fires when stage 1 has been generated.
  const existingTryOn =
    assessment && assessment.stage_1_cut_family
      ? await getMostRecentTryOnForCut(
          supabase,
          user.id,
          assessment.stage_1_cut_family,
        )
      : null;

  const timezone =
    (userRow as { timezone: string | null; age: number | null } | null)
      ?.timezone ?? 'America/New_York';
  const userAge =
    (userRow as { timezone: string | null; age: number | null } | null)?.age ??
    null;
  const todayAppDay = appDayFor(timezone);
  // Stage 4 state requires a separate read for the daily-log count;
  // only worth doing once we have an assessment.
  const stage4 = assessment
    ? await getStage4State(supabase, user.id, assessment, todayAppDay)
    : null;

  // Pattern D On Protocol view needs the active fin/min interventions and
  // their event timeline. Skip the work entirely outside the treat path so
  // pages without Pattern D don't pay for these queries.
  const activeHairInterventions =
    assessment && assessment.stage_2_path === 'treat'
      ? (await listActiveInterventions(supabase, user.id)).filter(
          (i) => i.type === 'finasteride' || i.type === 'minoxidil',
        )
      : [];
  const eventsByInterventionId =
    activeHairInterventions.length > 0
      ? Object.fromEntries(
          await listEventsForInterventions(
            supabase,
            user.id,
            activeHairInterventions.map((i) => i.id),
          ),
        )
      : {};

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
          Your hair plan
        </h1>
        {!assessment && (
          <p className="mt-3 text-[15px] leading-relaxed text-zinc-700 dark:text-zinc-300">
            Four quick questions. Then Mister P writes you a short, specific
            plan based on what you said and what we know about your face,
            density, and hair type.
          </p>
        )}
        {assessment && editParam && hasReport && (
          <p className="mt-3 text-[15px] leading-relaxed text-zinc-700 dark:text-zinc-300">
            Edit your answers and submit. Mister P will rewrite the plan with
            the new inputs.
          </p>
        )}
        {assessment && hasReport && !editParam && (
          <p className="mt-3 text-[15px] leading-relaxed text-zinc-700 dark:text-zinc-300">
            Paced over weeks. Stages unfold as you actually do things — there’s
            nothing to power through in one sitting.
          </p>
        )}
      </header>

      {assessment && !hasReport && (
        <p className="mt-8 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
          Mister P couldn’t finish your plan last time. Submit again and we’ll
          try once more.
        </p>
      )}

      {showForm && (
        <section className={assessment && !hasReport ? 'mt-4' : 'mt-8'}>
          <HairAssessmentForm
            initialValues={
              assessment ? assessmentToInitialValues(assessment) : undefined
            }
            hasBaselinePhoto={hasBaselinePhoto}
            cancelHref={editParam && hasReport ? '/plan/hair' : undefined}
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
              href="/plan/hair?edit=1"
              className="underline decoration-dotted underline-offset-2 hover:text-zinc-700 dark:hover:text-zinc-200"
            >
              Edit answers
            </Link>
          </footer>

          <HairStage1Card
            cutFamily={assessment.stage_1_cut_family}
            barberText={assessment.stage_1_barber_text}
            generatedAt={assessment.stage_1_generated_at}
            completedAt={assessment.stage_1_completed_at}
            isPremium={premium.isPremium}
            hasBaselinePhoto={hasBaselinePhoto}
            existingTryOnUrl={existingTryOn?.signed_url ?? null}
            densityState={assessment.density_state}
            age={(userRow as { age: number | null } | null)?.age ?? null}
            faceShape={assessment.face_shape}
            baldingPattern={assessment.balding_pattern}
            baldingSeverity={assessment.balding_severity}
            ageFeelValue={ageFeelClean}
          />

          <HairStage2Card
            stage1Complete={assessment.stage_1_completed_at !== null}
            stage2Path={assessment.stage_2_path}
            stage2LockedInAt={assessment.stage_2_locked_in_at}
            densityState={assessment.density_state}
            currentInterventions={profile.current_interventions}
            cutFamily={assessment.stage_1_cut_family}
            age={userAge}
          />

          {assessment.stage_2_path === 'treat' && (
            <PatternDConsideringCard
              treatmentStartedAt={assessment.pattern_d_treatment_started_at}
              currentInterventions={profile.current_interventions}
              activeHairInterventions={activeHairInterventions}
              eventsByInterventionId={eventsByInterventionId}
            />
          )}

          <HairStage3Card
            stage2LockedIn={assessment.stage_2_locked_in_at !== null}
            recommendationText={assessment.stage_3_recommendation_text}
            generatedAt={assessment.stage_3_generated_at}
            acknowledgedAt={assessment.stage_3_acknowledged_at}
          />

          {stage4 && (
            <HairStage4Card
              stage3Acknowledged={assessment.stage_3_acknowledged_at !== null}
              isStarted={stage4.isStarted}
              isComplete={stage4.isComplete}
              target={stage4.target}
              count={stage4.count}
              hasLoggedToday={stage4.hasLoggedToday}
              startedAt={stage4.startedAt}
              completedAt={stage4.completedAt}
              isBaldTrack={
                assessment.stage_1_cut_family === 'bald_track' ||
                assessment.stage_1_cut_family === 'clean_shave' ||
                assessment.density_state === 'shaved_or_buzzed' ||
                assessment.stage_2_path === 'transition'
              }
            />
          )}

          <HairStage5Card
            stage4Complete={stage4?.isComplete ?? false}
            stage4Count={stage4?.count ?? null}
            stage4Target={stage4?.target ?? null}
            stage4StartedAt={stage4?.startedAt ?? null}
            startedAt={assessment.stage_5_started_at}
            cadenceDays={assessment.stage_5_cadence_days}
            lastSessionAt={assessment.stage_5_last_session_at}
            sessionCount={assessment.stage_5_session_count}
            cutFamily={assessment.stage_1_cut_family}
            stage2Path={assessment.stage_2_path}
          />

          <HairStage6Card
            stage5Started={assessment.stage_5_started_at !== null}
            startedAt={assessment.stage_6_started_at}
            cutCadenceWeeks={assessment.stage_6_cut_cadence_weeks}
            cutFamily={assessment.stage_1_cut_family}
          />

          {/* Considering remedies (transplant / SMP / hair system).
              Surfaces under the bald-track or advanced-thinning
              density paths — these are users for whom medication
              alone often isn't sufficient and external/surgical
              options are worth seeing in the same posture-consistent
              format the rest of the app uses. */}
          {(assessment.density_state === 'advanced_thinning' ||
            assessment.density_state === 'shaved_or_buzzed' ||
            assessment.stage_1_cut_family === 'bald_track' ||
            assessment.stage_1_cut_family === 'clean_shave') && (
            <RemediesConsideringCard />
          )}

          {/* Product-match quiz — interactive surface that teaches
              the POV 61 framework (matte vs shine, hair-texture
              match, front-hairline rule) by walking through 9
              real-world hair-and-situation scenarios. Renders
              unconditionally below the report; no gate. */}
          <HairProductQuizCard />
        </article>
      )}
    </main>
  );
}

// Snapshot of the saved row in the shape the form expects. Lives on the
// page rather than the form so the form stays unaware of the
// HairAssessment row shape (which carries report fields the form doesn't
// touch).
function assessmentToInitialValues(
  a: HairAssessment,
): HairAssessmentInitialValues {
  return {
    face_shape: a.face_shape,
    density_state: a.density_state,
    hair_type_strand: a.hair_type_strand,
    hair_type_pattern: a.hair_type_pattern,
    hair_type_density: a.hair_type_density,
    head_shape: a.head_shape,
    head_size: a.head_size,
    graying_level: a.graying_level,
    ear_prominence: a.ear_prominence,
    balding_pattern: a.balding_pattern,
    balding_severity: a.balding_severity,
    current_routine: a.current_routine,
    hair_goal_text: a.hair_goal_text,
  };
}
