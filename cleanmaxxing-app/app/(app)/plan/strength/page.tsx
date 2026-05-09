// /plan/strength — Pattern A seventh topic, v0. Built off the
// Israetel hypertrophy framework (POV 19-strength-training).
// Cross-modifier-aware of the nutrition plan: when a nutrition
// assessment exists, the strength prescription uses its
// goal_direction (cut / recomp / bulk) so the two stay aligned.
//
// Same four states as the other Pattern A v0 plans.

import Link from 'next/link';
import { redirect } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { createClient, getUser } from '@/lib/supabase/server';
import {
  getRecentStrengthSessionCount,
  getStrengthAssessment,
} from '@/lib/strength/service';
import type { StrengthAssessment } from '@/lib/strength/types';
import type { TrainingExperience } from '@/lib/profile/service';
import { STRENGTH_EXERCISES } from '@/lib/strength/types';
import {
  DEFAULT_OWNED_BY_ACCESS,
  gearRequiredForExercises,
  isValidGearItem,
  type GearItem,
} from '@/lib/strength/gear';
import { getRecommendedExercises } from '@/lib/strength/recommended-exercises';
import { AlcoholRecoveryCallout } from '@/components/alcohol-recovery-callout';
import {
  getNutritionAssessment,
  hasNutritionAssessment,
} from '@/lib/nutrition/service';
import { getUserProfile } from '@/lib/profile/service';
import {
  StrengthAssessmentForm,
  type StrengthAssessmentInitialValues,
} from './assessment-form';
import { ExerciseLibraryPanel } from './exercise-library-panel';
import { EquipmentListCard } from './equipment-list-card';
import { WarmupMobilityPanel } from './warmup-mobility-panel';
import {
  allStaticMobility,
  patternSpecificWarmups,
  universalWarmups,
} from '@/lib/strength/warmup-mobility';
import { BeginnerRampCard } from './beginner-ramp-card';
import { PlateauCard } from './plateau-card';

type Props = {
  searchParams: Promise<{ edit?: string }>;
};

export default async function StrengthPlanPage({ searchParams }: Props) {
  const params = await searchParams;
  const editParam = params.edit === '1';

  const user = await getUser();
  if (!user) redirect('/login');
  const supabase = await createClient();

  // Pull assessment + the live session count + nutrition presence
  // in parallel. Session count powers the pre-form data preview;
  // nutrition presence drives a friendly nudge in the page header.
  const [
    assessment,
    sessionsLast7,
    nutritionPresence,
    profile,
    nutritionAssessment,
  ] = await Promise.all([
    getStrengthAssessment(supabase, user.id),
    getRecentStrengthSessionCount(supabase, user.id, 7),
    hasNutritionAssessment(supabase, user.id),
    getUserProfile(supabase, user.id),
    // Pulled to surface the alcohol-modifier callout when alcohol_use
    // is moderate / heavy. Mirrors the cardio page's existing nutrition
    // load. Optional — the callout component handles null.
    getNutritionAssessment(supabase, user.id),
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
          Your strength plan
        </h1>
        {!assessment && (
          <>
            <p className="mt-3 text-[15px] leading-relaxed text-zinc-700 dark:text-zinc-300">
              Four short questions about your goal, days available, equipment,
              and current pattern. Mister P writes a specific plan grounded
              in Dr. Mike Israetel&rsquo;s hypertrophy framework — no junk
              volume, no maxing out, no chasing weights you can&rsquo;t
              maintain.
            </p>
            {!nutritionPresence.hasReport && (
              <p className="mt-2 text-[13px] text-zinc-500 dark:text-zinc-400">
                Tip: complete your{' '}
                <Link
                  href="/plan/nutrition"
                  className="underline decoration-dotted underline-offset-2"
                >
                  nutrition plan
                </Link>{' '}
                first if you can — the strength plan reads its goal direction
                (cut / recomp / bulk) and tailors the prescription.
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
            Strength changes show up over months. Stay on the prescription,
            give it the deload cycle it needs, come back when something
            shifts.
          </p>
        )}
      </header>

      {/* Pre-form data preview — when there's no plan yet AND the
          user has at least one strength session in the last 7 days. */}
      {!assessment && sessionsLast7 > 0 && (
        <section className="mt-6 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
            What Mister P will see when writing your plan
          </h2>
          <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 text-[13px]">
            <DataRow label="Strength sessions (last 7 days)">
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
          <StrengthAssessmentForm
            initialValues={
              assessment
                ? assessmentToInitialValues(
                    assessment,
                    profile.training_experience,
                  )
                : undefined
            }
            initialTrainingExperience={profile.training_experience}
            cancelHref={editParam && hasReport ? '/plan/strength' : undefined}
          />
        </section>
      )}

      {!showForm && assessment && hasReport && (
        <article className="mt-8">
          <AlcoholRecoveryCallout
            alcohol_use={nutritionAssessment?.alcohol_use ?? null}
            surface="strength"
          />
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

          {/* Beginner ramp graduation gate. Shows for users in the
              ramp window (training_experience 'none' or 'under_1y'
              AND not yet marked complete) once 6+ weeks have passed
              since the report was generated. */}
          {(profile.training_experience === 'none' ||
            profile.training_experience === 'under_1y') &&
            !assessment.beginner_ramp_completed_at &&
            (() => {
              const weeks = Math.floor(
                (Date.now() -
                  new Date(assessment.report_generated_at!).getTime()) /
                  (7 * 24 * 60 * 60 * 1000),
              );
              return weeks >= 6 ? (
                <BeginnerRampCard weeksSinceReport={weeks} />
              ) : null;
            })()}

          {/* Plateau intervention gate. Shows for users 12+ weeks
              past report OR last plateau intervention (~3 deload
              cycles). Skip during the beginner ramp window — that's
              its own gate. */}
          {assessment.beginner_ramp_completed_at !== null ||
          (profile.training_experience !== 'none' &&
            profile.training_experience !== 'under_1y')
            ? (() => {
                const lastTouchMs = Math.max(
                  new Date(assessment.report_generated_at!).getTime(),
                  assessment.last_plateau_intervention_at
                    ? new Date(assessment.last_plateau_intervention_at).getTime()
                    : 0,
                );
                const weeks = Math.floor(
                  (Date.now() - lastTouchMs) / (7 * 24 * 60 * 60 * 1000),
                );
                return weeks >= 12 ? (
                  <PlateauCard weeksSinceLastIntervention={weeks} />
                ) : null;
              })()
            : null}

          <ExerciseLibraryPanel
            equipmentAccess={assessment.equipment_access}
            injuryConstraints={assessment.injury_constraints}
            priorityMuscles={assessment.priority_muscles}
            secondaryObjective={assessment.secondary_objective}
            bodyweightPreference={assessment.bodyweight_preference}
            equipmentOwned={assessment.equipment_owned}
            initialSelected={assessment.selected_exercise_slugs}
            initialExcluded={assessment.excluded_exercise_slugs}
            initialFilterText={assessment.exercise_filter_text}
          />

          {(() => {
            // Buying-list gear computation. Source of truth for
            // "what's in your plan" = the user's selected exercises
            // when non-empty, falling back to the recommended subset
            // (density/age/injury/preference filtered) when no
            // explicit picks exist yet.
            const selected = STRENGTH_EXERCISES.filter((ex) =>
              assessment.selected_exercise_slugs.includes(ex.slug),
            );
            const sourceExercises =
              selected.length > 0
                ? selected
                : getRecommendedExercises({
                    equipment_access: assessment.equipment_access,
                    injury_constraints: assessment.injury_constraints,
                    priority_muscles: assessment.priority_muscles,
                    secondary_objective: assessment.secondary_objective,
                    bodyweight_preference: assessment.bodyweight_preference,
                    equipment_owned: assessment.equipment_owned,
                  }).recommended;
            const required = gearRequiredForExercises(sourceExercises);

            // Seed initialOwned: persisted column when non-null,
            // otherwise equipment-access default. The card surfaces a
            // hint when the values are seeded so the user knows to
            // refine before the first save.
            const isSeededDefault = assessment.equipment_owned == null;
            const initialOwnedRaw = isSeededDefault
              ? DEFAULT_OWNED_BY_ACCESS[assessment.equipment_access] ?? []
              : assessment.equipment_owned ?? [];
            const initialOwned = initialOwnedRaw.filter(
              (s): s is GearItem => isValidGearItem(s),
            );

            return (
              <EquipmentListCard
                required={required}
                initialOwned={initialOwned}
                isSeededDefault={isSeededDefault}
              />
            );
          })()}

          {(() => {
            // Warm-up + mobility panel. Lift-specific warm-ups
            // derived from the patterns of the user's selected (or
            // recommended-fallback) exercises. Universal warm-ups +
            // all static mobility surface unconditionally.
            const selected = STRENGTH_EXERCISES.filter((ex) =>
              assessment.selected_exercise_slugs.includes(ex.slug),
            );
            const sourceExercises =
              selected.length > 0
                ? selected
                : getRecommendedExercises({
                    equipment_access: assessment.equipment_access,
                    injury_constraints: assessment.injury_constraints,
                    priority_muscles: assessment.priority_muscles,
                    secondary_objective: assessment.secondary_objective,
                    bodyweight_preference: assessment.bodyweight_preference,
                    equipment_owned: assessment.equipment_owned,
                  }).recommended;
            const patterns = Array.from(
              new Set(sourceExercises.map((ex) => ex.movement_pattern)),
            );
            return (
              <WarmupMobilityPanel
                universalWarmups={universalWarmups()}
                liftSpecificWarmups={patternSpecificWarmups(patterns)}
                staticMobility={allStaticMobility()}
              />
            );
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
              href="/plan/strength?edit=1"
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
  a: StrengthAssessment,
  trainingExperience: TrainingExperience | null,
): StrengthAssessmentInitialValues {
  return {
    primary_goal: a.primary_goal,
    days_per_week: a.days_per_week,
    equipment_access: a.equipment_access,
    // Lives on user_profile, not on the strength_assessments row.
    // Pulled from profile so the form pre-fills it on edit.
    training_experience: trainingExperience,
    current_split: a.current_split,
    strength_goal_text: a.strength_goal_text,
    priority_muscles: a.priority_muscles,
    lagging_muscles_text: a.lagging_muscles_text,
    secondary_objective: a.secondary_objective,
    injury_constraints: a.injury_constraints,
    bodyweight_preference: a.bodyweight_preference,
    asymmetry_concern: a.asymmetry_concern,
  };
}
