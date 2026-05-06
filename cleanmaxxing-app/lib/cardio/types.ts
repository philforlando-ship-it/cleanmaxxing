// Shared types + Zod schema for cardio v0. Mirrors check constraints
// in supabase/migrations/0056_cardio_assessments.sql.

import { z } from 'zod';

export type CardioPrimaryRole =
  | 'support_fat_loss'
  | 'cardiovascular_health'
  | 'conditioning_for_lifting'
  | 'general_movement'
  | 'not_sure';

export type CardioCurrentMovement =
  | 'mostly_sedentary'
  | 'light_movement'
  | 'some_cardio'
  | 'regular_cardio'
  | 'inconsistent';

export type CardioModalityPreference =
  | 'running_jogging'
  | 'cycling'
  | 'rowing'
  | 'walking_hiking'
  | 'classes_group'
  | 'swimming'
  | 'hate_all_cardio';

export type CardioDaysPerWeek =
  | '0_days'
  | '1_2_days'
  | '3_4_days'
  | '5_plus_days';

export type CardioAssessment = {
  user_id: string;
  primary_role: CardioPrimaryRole;
  current_movement: CardioCurrentMovement;
  modality_preference: CardioModalityPreference;
  days_per_week: CardioDaysPerWeek;
  cardio_goal_text: string | null;
  // Stage milestone (migration 0060) — NEAT → structured Zone 2.
  // Fires for users who started at '0_days' (step count only) once
  // step count baseline is established (4+ weeks).
  zone_2_layer_started_at: string | null;
  // Stage milestone (migration 0061) — HIIT layer added on top of
  // Zone 2 base. POV 23 names the Norwegian 4×4 protocol as the
  // cleanest template at this stage.
  hiit_layer_started_at: string | null;
  report_text: string | null;
  report_generated_at: string | null;
  report_model: string | null;
  report_input_modifiers: CardioReportInputModifiers | null;
  created_at: string;
  updated_at: string;
};

export type CardioReportInputModifiers = {
  // Profile
  bf_pct_self_estimate: string | null;
  daily_training_minutes: number | null;
  activity_level: string | null;
  training_experience: string | null;
  current_interventions: string[];
  age: number | null;
  // Live data — last 7 days cardio sessions
  cardio_sessions_last_7: number;
  // Cross-modifier from nutrition (when assessed)
  nutrition_goal_direction: string | null;
  // Cross-modifier from strength (when assessed)
  strength_days_per_week: string | null;
  // Stage milestone — NEAT → Zone 2 transition timestamp. When set,
  // the user has moved past sedentary baseline; the prompt should
  // not gate on step count alone anymore.
  zone_2_layer_started_at: string | null;
  // Stage milestone — HIIT layer added. When set, prompt prescribes
  // Zone 2 + 1 HIIT (Norwegian 4×4 default at age 35+).
  hiit_layer_started_at: string | null;
};

export const PRIMARY_ROLE_LABEL: Record<CardioPrimaryRole, string> = {
  support_fat_loss:
    'Support fat loss — help me stay lean (alongside diet and lifting)',
  cardiovascular_health:
    'Cardiovascular health — build heart health / VO₂max for the long run',
  conditioning_for_lifting:
    'Conditioning for lifting — improve recovery and work capacity',
  general_movement:
    'General movement — just want to move more and feel better day to day',
  not_sure: 'Not sure yet',
};

export const CURRENT_MOVEMENT_LABEL: Record<CardioCurrentMovement, string> = {
  mostly_sedentary:
    'Mostly sedentary — desk job, under 5,000 steps most days, no formal cardio',
  light_movement:
    'Light movement — 5,000–7,000 steps, occasional walks, no structured cardio',
  some_cardio: 'Some structured cardio (1–2 sessions a week)',
  regular_cardio: 'Regular structured cardio (3+ sessions a week)',
  inconsistent: 'Inconsistent — varies wildly week to week',
};

export const MODALITY_PREFERENCE_LABEL: Record<
  CardioModalityPreference,
  string
> = {
  running_jogging: 'Running or jogging',
  cycling: 'Cycling — indoor or outdoor',
  rowing: 'Rowing',
  walking_hiking: 'Walking or hiking',
  classes_group: 'Classes / group settings (spin, rowing classes, hiking groups)',
  swimming: 'Swimming',
  hate_all_cardio:
    'Hate all cardio — just want the minimum that actually works',
};

export const CARDIO_DAYS_PER_WEEK_LABEL: Record<CardioDaysPerWeek, string> = {
  '0_days': '0 — I’ll rely on step count / daily movement only',
  '1_2_days': '1–2 days a week',
  '3_4_days': '3–4 days a week',
  '5_plus_days': '5+ days a week',
};

export const CardioAssessmentInputSchema = z.object({
  primary_role: z.enum([
    'support_fat_loss',
    'cardiovascular_health',
    'conditioning_for_lifting',
    'general_movement',
    'not_sure',
  ]),
  current_movement: z.enum([
    'mostly_sedentary',
    'light_movement',
    'some_cardio',
    'regular_cardio',
    'inconsistent',
  ]),
  modality_preference: z.enum([
    'running_jogging',
    'cycling',
    'rowing',
    'walking_hiking',
    'classes_group',
    'swimming',
    'hate_all_cardio',
  ]),
  days_per_week: z.enum(['0_days', '1_2_days', '3_4_days', '5_plus_days']),
  cardio_goal_text: z.string().max(280).nullable(),
});

export type CardioAssessmentInput = z.infer<
  typeof CardioAssessmentInputSchema
>;
