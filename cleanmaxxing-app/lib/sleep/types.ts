// Shared types + Zod schema for sleep assessment v0. Mirrors check
// constraints in supabase/migrations/0049_sleep_assessments.sql.
//
// Note: this file is for the *plan / assessment* layer. The tracker
// (sleep_logs reads via getSleepState) lives in lib/sleep/service.ts —
// the same file the assessment service is added to, but the types
// stay split because the tracker has its own SleepLog/SleepState
// shapes from before the assessment existed.

import { z } from 'zod';

export type SleepPrimaryConcern =
  | 'not_enough_total'
  | 'cant_fall_asleep'
  | 'wake_during_night'
  | 'wake_up_tired'
  | 'inconsistent_schedule'
  | 'generally_fine';

export type SleepBiggestBlocker =
  | 'screens_late'
  | 'caffeine_late'
  | 'evening_alcohol'
  | 'late_exercise'
  | 'racing_thoughts'
  | 'environment'
  | 'partner_or_kids'
  | 'nothing_obvious';

export type SleepScheduleConsistency =
  | 'consistent_daily'
  | 'consistent_weekday_only'
  | 'inconsistent'
  | 'shift_work';

export type SleepWhatTried =
  | 'nothing_systematic'
  | 'caffeine_cutoffs'
  | 'screen_cutoffs'
  | 'supplements'
  | 'mindfulness_breathing'
  | 'multiple_things';

export type SleepAssessment = {
  user_id: string;
  // Q1, Q2, Q4 are multi-select. Q1 + Q2 capped at 3 in the form
  // and the migration check constraint; Q4 is uncapped.
  primary_concerns: SleepPrimaryConcern[];
  biggest_blockers: SleepBiggestBlocker[];
  schedule_consistency: SleepScheduleConsistency;
  what_tried: SleepWhatTried[];
  sleep_goal_text: string | null;
  // Stage milestone (migration 0060) — behavioral baseline → OTC
  // supplements consideration. Set when the user has worked the
  // behavioral commitments for 4+ weeks and sleep still isn't
  // landing — the next layer is OTC supplements (melatonin /
  // magnesium / glycine), with the prescriber path as the layer
  // beyond that.
  otc_supplements_considered_at: string | null;
  // Stage milestone (migration 0061) — apnea screening surfaced.
  // Narrower than a generic Rx escalation — POV 42 supports the
  // apnea-specific framing (loud snoring, witnessed pauses, choking
  // awakenings, BMI > 30, neck > 17") but is skeptical of generic
  // Rx for insomnia.
  apnea_screening_surfaced_at: string | null;
  report_text: string | null;
  report_generated_at: string | null;
  report_model: string | null;
  report_input_modifiers: SleepReportInputModifiers | null;
  created_at: string;
  updated_at: string;
};

// Modifier shape captures both the data signal (rolling avg from
// sleep_logs) and the profile/clinical context. Persisted as the
// report_input_modifiers jsonb so future changes are diffable.
export type SleepReportInputModifiers = {
  rolling_avg_hours: number | null;
  rolling_avg_quality: number | null;
  rolling_count: number;
  profile_avg_sleep_hours: number | null;
  current_interventions: string[];
  age: number | null;
  // Stage milestone — user has acknowledged moving from behavioral
  // baseline to OTC supplement layer. Prompt leans into supplement
  // guidance more directly when set.
  otc_supplements_considered_at: string | null;
  // Stage milestone — apnea screening surfaced. Prompt leans into
  // apnea-specific framing (sleep study referral) when set.
  apnea_screening_surfaced_at: string | null;
};

export const PRIMARY_CONCERN_LABEL: Record<SleepPrimaryConcern, string> = {
  not_enough_total: 'Not enough total sleep',
  cant_fall_asleep: 'Can’t fall asleep when I want to',
  wake_during_night: 'Wake up during the night',
  wake_up_tired: 'Sleep enough hours but wake up tired',
  inconsistent_schedule: 'Inconsistent bedtime and wake time',
  generally_fine: 'Generally fine — want to optimize',
};

export const BIGGEST_BLOCKER_LABEL: Record<SleepBiggestBlocker, string> = {
  screens_late: 'Screens within 30 minutes of bed',
  caffeine_late: 'Caffeine in the afternoon (after noon) most days',
  evening_alcohol: 'Alcohol most evenings',
  late_exercise: 'Workouts within 2 hours of bed',
  racing_thoughts: 'Mind won’t turn off',
  environment: 'Room temp / light / noise',
  partner_or_kids: 'Partner / pets / kids wake me',
  nothing_obvious: 'Nothing obvious',
};

export const SCHEDULE_CONSISTENCY_LABEL: Record<
  SleepScheduleConsistency,
  string
> = {
  consistent_daily: 'Within an hour every day, weekends included',
  consistent_weekday_only: 'Consistent weekdays, drift on weekends',
  inconsistent: 'Varies by more than 2 hours night to night',
  shift_work: 'Rotating or shift work',
};

export const WHAT_TRIED_LABEL: Record<SleepWhatTried, string> = {
  nothing_systematic: 'Nothing systematic yet',
  caffeine_cutoffs: 'Cut caffeine in the afternoon',
  screen_cutoffs: 'Cut screens before bed',
  supplements: 'Tried supplements (melatonin, magnesium)',
  mindfulness_breathing: 'Breathing exercises or meditation',
  multiple_things: 'Multiple things — none stuck',
};

export const SleepAssessmentInputSchema = z.object({
  primary_concerns: z
    .array(
      z.enum([
        'not_enough_total',
        'cant_fall_asleep',
        'wake_during_night',
        'wake_up_tired',
        'inconsistent_schedule',
        'generally_fine',
      ]),
    )
    .min(1)
    .max(3),
  biggest_blockers: z
    .array(
      z.enum([
        'screens_late',
        'caffeine_late',
        'evening_alcohol',
        'late_exercise',
        'racing_thoughts',
        'environment',
        'partner_or_kids',
        'nothing_obvious',
      ]),
    )
    .min(1)
    .max(3),
  schedule_consistency: z.enum([
    'consistent_daily',
    'consistent_weekday_only',
    'inconsistent',
    'shift_work',
  ]),
  what_tried: z
    .array(
      z.enum([
        'nothing_systematic',
        'caffeine_cutoffs',
        'screen_cutoffs',
        'supplements',
        'mindfulness_breathing',
        'multiple_things',
      ]),
    )
    .min(1),
  sleep_goal_text: z.string().max(280).nullable(),
});

export type SleepAssessmentInput = z.infer<typeof SleepAssessmentInputSchema>;
