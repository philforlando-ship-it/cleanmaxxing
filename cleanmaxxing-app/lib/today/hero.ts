// "Today's one thing" — picks a single highest-priority surface
// to pin at the top of /today. The full waterfall still scrolls
// below; the hero is a thin pointer that anchors the user's
// attention on the next concrete action, not a duplicate of any
// underlying card. Clicking the CTA scrolls to the matching card
// (the source of truth) and opens it for input.
//
// Priority is the user's current loop state, ordered by what
// "showing up today" actually means:
//
//   1. Daily check-in not done yet  →  check in
//   2. Sunday and weekly reflection not saved  →  reflect
//   3. Workout not logged today AND it's a likely workout day  →  log workout
//   4. Sleep from last night not logged  →  log sleep
//   5. Nutrition not logged today  →  log protein
//   6. All trackers caught up  →  reflect on the daily note (or rest)
//
// "Likely workout day" is left intentionally simple: Mon/Wed/Fri
// for new users, plus any day where any active goal's source_slug
// is in the strength-or-cardio set. We don't try to read user
// schedules — too brittle for too little gain. A user who never
// works out on Wed will see the workout CTA below the check-in
// CTA on Wed once a week and ignore it; that's a fine cost.

import type { TodayCheckInState } from '@/lib/check-in/service';
import type { SleepLog } from '@/lib/sleep/service';
import type { WorkoutLog } from '@/lib/workout/service';
import type { WeeklyReflectionState } from '@/lib/weekly-reflection/service';
import { appDayFor, previousAppDayFor } from '@/lib/date/app-day';

export type HeroKind =
  | 'check-in'
  | 'weekly-reflection'
  | 'workout'
  | 'sleep'
  | 'nutrition'
  | 'rest';

export type HeroSurface = {
  kind: HeroKind;
  // Headline copy. Short. Acts as the call.
  title: string;
  // Subline: why this one, in one sentence. Optional.
  sub: string | null;
  // Button label.
  ctaLabel: string;
  // DOM id (without #) of the underlying card the CTA scrolls to.
  // The /today page wraps each underlying card in a div with this
  // id so the hero anchor → card transition is one source of truth.
  anchorId: string;
};

type Input = {
  weekday: number; // 0 = Sunday, 6 = Saturday
  steppedAway: boolean;
  hasActiveGoals: boolean;
  checkIn: TodayCheckInState;
  reflection: WeeklyReflectionState;
  recentSleep: SleepLog[];
  recentWorkouts: WorkoutLog[];
  nutritionLoggedToday: boolean;
  timezone: string;
  // Active goal slugs. Used to bias the workout CTA up the list when
  // the user has a strength/cardio goal active.
  activeGoalSlugs: string[];
};

// Slugs whose daily proof is a workout session. Bumps workout up
// the priority list on those goals' active days. Conservative —
// missing a slug just means workout sits behind sleep/nutrition,
// which is fine.
const WORKOUT_SLUGS = new Set([
  '19-strength-training',
  '23-cardio',
  '46-mobility',
  '50-posture',
]);

const DEFAULT_WORKOUT_DAYS = new Set<number>([1, 3, 5]); // Mon Wed Fri

export function pickHero(input: Input): HeroSurface | null {
  if (input.steppedAway) return null;

  // No goals yet → push the user to the goals library. This is the
  // post-onboarding pre-pickup gap; rare, but the hero shouldn't
  // be silent.
  if (!input.hasActiveGoals) {
    return {
      kind: 'check-in',
      title: 'Pick your starting goals',
      sub: 'You finished onboarding but haven’t picked any goals yet. The daily loop kicks in once you have at least one.',
      ctaLabel: 'Browse goals',
      anchorId: 'daily-check-in',
    };
  }

  // 1. Daily check-in not done yet.
  if (input.checkIn.check_in_id === null) {
    const goalCount = input.checkIn.goals.length;
    return {
      kind: 'check-in',
      title: 'Today’s check-in',
      sub:
        goalCount === 1
          ? 'One goal to mark for today. Takes a few seconds.'
          : `${goalCount} goals to mark for today. Takes a few seconds.`,
      ctaLabel: 'Check in',
      anchorId: 'daily-check-in',
    };
  }

  // 2. Sunday + weekly reflection not yet saved.
  const isSunday = input.weekday === 0;
  if (isSunday && input.reflection.current === null) {
    return {
      kind: 'weekly-reflection',
      title: 'Weekly reflection',
      sub: 'Sunday is the snapshot. Process adherence per active journey, a few outcome questions, about two minutes.',
      ctaLabel: 'Reflect',
      anchorId: 'weekly-reflection',
    };
  }

  // 3. Workout not logged today AND it's a workout-relevant day.
  const today = appDayFor(input.timezone);
  const workoutLoggedToday = input.recentWorkouts.some(
    (w) => w.performed_on === today,
  );
  const hasWorkoutGoal = input.activeGoalSlugs.some((s) =>
    WORKOUT_SLUGS.has(s),
  );
  const isWorkoutDay = hasWorkoutGoal || DEFAULT_WORKOUT_DAYS.has(input.weekday);
  if (!workoutLoggedToday && isWorkoutDay) {
    return {
      kind: 'workout',
      title: 'Log today’s workout',
      sub: hasWorkoutGoal
        ? 'You have an active training goal. A line is enough.'
        : 'A line is enough — type, duration, done.',
      ctaLabel: 'Log session',
      anchorId: 'workout-log',
    };
  }

  // 4. Last night's sleep.
  const lastNight = previousAppDayFor(input.timezone);
  const sleepLoggedLastNight = input.recentSleep.some(
    (s) => s.night_of === lastNight,
  );
  if (!sleepLoggedLastNight) {
    return {
      kind: 'sleep',
      title: 'Last night’s sleep',
      sub: 'Hours and a quick quality tap. Nothing fancy.',
      ctaLabel: 'Log sleep',
      anchorId: 'sleep-log',
    };
  }

  // 5. Nutrition (protein-target hit).
  if (!input.nutritionLoggedToday) {
    return {
      kind: 'nutrition',
      title: 'Hit your protein today?',
      sub: 'One tap. Yes / no — grams optional.',
      ctaLabel: 'Log protein',
      anchorId: 'nutrition-log',
    };
  }

  // 6. Everything caught up — point at the daily note for a soft
  // close. Lower stakes; if the user has nothing left to do, give
  // them a thinking surface, not a chore.
  return {
    kind: 'rest',
    title: 'You’re caught up for today.',
    sub: 'Nothing else is owed. Mister P has a question below if you want it.',
    ctaLabel: 'Read Mister P',
    anchorId: 'daily-note',
  };
}
