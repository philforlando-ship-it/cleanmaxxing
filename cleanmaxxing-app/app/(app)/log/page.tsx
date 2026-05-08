// /log — centralized landing page for daily logging surfaces (Phase C
// of the /today redesign).
//
// Sleep, nutrition, workout, and daily check-in were previously
// rendered inline on /today. Per the redesign's "decreasing-prominence
// /today" principle, /today now reserves space for the primary action
// (Area 1) and a small set of event-driven daily-action tiles. The
// generic logging surfaces moved here so users always have a clean
// destination for "I want to record what happened."
//
// The cards are imported from /today's directory directly — they're
// not /today-specific in their logic, just happen to live there for
// historical reasons. A future cleanup can move them to a shared
// components/ location once a third surface consumes them.

import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient, getUser } from '@/lib/supabase/server';
import { getSleepState } from '@/lib/sleep/service';
import { getWorkoutState } from '@/lib/workout/service';
import { getNutritionState } from '@/lib/nutrition/service';
import { getTodayCheckInState } from '@/lib/check-in/service';
import { getStage4State, getHairAssessment } from '@/lib/hair/service';
import { getStrengthAssessment } from '@/lib/strength/service';
import { getRecommendedExercises } from '@/lib/strength/recommended-exercises';
import {
  STRENGTH_EXERCISES,
  type StrengthExercise,
} from '@/lib/strength/types';
import { defaultSetsRepsFor } from '@/lib/strength/log-defaults';
import { appDayFor } from '@/lib/date/app-day';
import { SleepLogCard } from '@/app/(app)/today/sleep-log-card';
import { NutritionLogCard } from '@/app/(app)/today/nutrition-log-card';
import {
  WorkoutLogCard,
  type PlanExerciseDefault,
} from '@/app/(app)/today/workout-log-card';
import { DailyCheckInCard } from '@/app/(app)/today/daily-check-in-card';
import { HairRoutineCard } from '@/app/(app)/today/hair-routine-card';

// "Insert from plan" dropdown cap. The selected/recommended list can run
// long; capping keeps the dropdown scannable. Users who need beyond this
// can still type the exercise name freely.
const PLAN_DROPDOWN_LIMIT = 16;

export default async function LogPage() {
  const user = await getUser();
  if (!user) redirect('/login');
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from('users')
    .select('timezone, tracking_paused_at')
    .eq('id', user.id)
    .maybeSingle();
  const timezone =
    (profile?.timezone as string | null) ?? 'America/New_York';
  const steppedAway = Boolean(profile?.tracking_paused_at);

  // Hair Stage 4 daily-routine surface — only fetched when the user
  // is in Stage 4. Most users won't see this card.
  const hairAssessment = await getHairAssessment(supabase, user.id);
  const hairStage4 =
    hairAssessment && hairAssessment.stage_4_started_at
      ? await getStage4State(
          supabase,
          user.id,
          hairAssessment,
          appDayFor(timezone),
        )
      : null;

  const [
    sleepState,
    workoutState,
    nutritionState,
    checkInState,
    strengthAssessment,
  ] = await Promise.all([
    getSleepState(supabase, user.id),
    getWorkoutState(supabase, user.id),
    getNutritionState(supabase, user.id, timezone),
    getTodayCheckInState(supabase, user.id, timezone),
    getStrengthAssessment(supabase, user.id),
  ]);

  // Plan exercises drive the "Insert from plan" dropdown on the
  // workout-log card. Mirrors the precedence used inside /plan/strength:
  // user's explicit selected_exercise_slugs first; if empty, fall back
  // to the recommender's top recommendations using the same args.
  // When there's no strength assessment at all (user hasn't started the
  // strength journey yet), the dropdown stays hidden and the form keeps
  // the legacy free-text entry behavior.
  let planExercises: PlanExerciseDefault[] = [];
  if (strengthAssessment) {
    const selectedSlugs = strengthAssessment.selected_exercise_slugs ?? [];
    let sourceExercises: StrengthExercise[];
    if (selectedSlugs.length > 0) {
      sourceExercises = STRENGTH_EXERCISES.filter((ex) =>
        selectedSlugs.includes(ex.slug),
      );
    } else {
      sourceExercises = getRecommendedExercises({
        equipment_access: strengthAssessment.equipment_access,
        injury_constraints: strengthAssessment.injury_constraints,
        priority_muscles: strengthAssessment.priority_muscles,
        secondary_objective: strengthAssessment.secondary_objective,
        bodyweight_preference: strengthAssessment.bodyweight_preference,
        equipment_owned: strengthAssessment.equipment_owned,
      }).recommended;
    }
    planExercises = sourceExercises
      .slice(0, PLAN_DROPDOWN_LIMIT)
      .map((ex) => {
        const defaults = defaultSetsRepsFor(ex);
        return {
          slug: ex.slug,
          label: ex.label,
          default_sets: defaults.sets,
          default_reps: defaults.reps,
        };
      });
  }

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
          Log
        </h1>
        <p className="mt-3 text-[14px] leading-relaxed text-zinc-700 dark:text-zinc-300">
          The daily basics — sleep, training, food, the check-in. Not
          tied to any focus area, not mandatory. What you log here
          grounds Mister P&rsquo;s answers and quietly shapes your
          reports.
        </p>
      </header>

      {steppedAway ? (
        <section className="mt-8 rounded-xl border border-zinc-300 bg-zinc-50 p-6 dark:border-zinc-700 dark:bg-zinc-900">
          <h2 className="text-lg font-medium">You&rsquo;re stepped away.</h2>
          <p className="mt-2 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
            Logging is paused while you&rsquo;re stepped away. Your
            history is saved.{' '}
            <Link
              href="/settings"
              className="underline decoration-dotted underline-offset-2 hover:text-zinc-900 dark:hover:text-zinc-100"
            >
              Resume
            </Link>{' '}
            when you&rsquo;re ready.
          </p>
        </section>
      ) : (
        <div className="mt-8 space-y-6">
          <div id="sleep-log" className="scroll-mt-16">
            <SleepLogCard
              recent={sleepState.recent}
              rollingAvgHours={sleepState.rollingAvgHours}
              rollingCount={sleepState.rollingCount}
              timezone={timezone}
            />
          </div>

          <div id="workout-log" className="scroll-mt-16">
            <WorkoutLogCard
              recent={workoutState.recent}
              timezone={timezone}
              planExercises={planExercises}
            />
          </div>

          <div id="nutrition-log" className="scroll-mt-16">
            <NutritionLogCard state={nutritionState} timezone={timezone} />
          </div>

          <div id="daily-check-in" className="scroll-mt-16">
            <DailyCheckInCard initialState={checkInState} />
          </div>

          {hairStage4 && hairStage4.target !== null && (
            <HairRoutineCard
              count={hairStage4.count}
              target={hairStage4.target}
              hasLoggedToday={hairStage4.hasLoggedToday}
              isBaldTrack={
                hairAssessment !== null &&
                (hairAssessment.stage_1_cut_family === 'bald_track' ||
                  hairAssessment.stage_1_cut_family === 'clean_shave' ||
                  hairAssessment.density_state === 'shaved_or_buzzed' ||
                  hairAssessment.stage_2_path === 'transition')
              }
            />
          )}
        </div>
      )}
    </main>
  );
}
