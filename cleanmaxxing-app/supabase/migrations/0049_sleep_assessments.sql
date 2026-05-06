-- ==========================================
-- Cleanmaxxing — sleep_assessments (Pattern A fourth topic, v0)
-- ==========================================
-- Mirrors style / facial_hair / hair assessment table shape — one row
-- per user, assessment columns + free text + report fields.
--
-- Sleep is the first Pattern A topic that ingests live data: the
-- report generator pulls rolling avg hours + quality from sleep_logs
-- (the existing tracker table) and surfaces those numbers in the
-- "Where you actually are" section. Assessment captures the user's
-- *intent and context* (concern, blocker, schedule, what they've
-- tried) so the plan can recommend actions tailored to BOTH the
-- self-report AND the data signal.
--
-- Modifier sources read at report generation time:
--   sleep_logs (last 7 logged nights → rolling avg hours, quality, count)
--   user_profile.avg_sleep_hours (fallback when no logs exist)
--   user_profile.current_interventions (ssri, adhd_stimulant — both
--     affect sleep architecture; stimulants taken late hurt onset,
--     SSRIs commonly disrupt REM)
--   users.age (sleep architecture changes through 30s/40s)
--
-- Run in Supabase SQL Editor.

create table if not exists public.sleep_assessments (
  user_id uuid primary key references public.users(id) on delete cascade,

  -- Q1: primary concerns. The user can pick up to 3 — sleep concerns
  -- often co-occur (not enough total + wake tired) and forcing a single
  -- pick muddied the report. Cap at 3 to keep the recommendation
  -- focused. 'generally_fine' is allowed for users who want to
  -- optimize rather than fix a problem.
  primary_concerns text[] not null check (
    array_length(primary_concerns, 1) >= 1
    and array_length(primary_concerns, 1) <= 3
    and primary_concerns <@ ARRAY[
      'not_enough_total',
      'cant_fall_asleep',
      'wake_during_night',
      'wake_up_tired',
      'inconsistent_schedule',
      'generally_fine'
    ]::text[]
  ),

  -- Q2: biggest blockers on a typical night. Up to 3 — most users have
  -- more than one (screens + caffeine, environment + partner). The
  -- recommendation prioritizes the highest-leverage of the picked set.
  -- 'nothing_obvious' triggers the "the issue may be physiological —
  -- talk to a prescriber" branch in the report.
  biggest_blockers text[] not null check (
    array_length(biggest_blockers, 1) >= 1
    and array_length(biggest_blockers, 1) <= 3
    and biggest_blockers <@ ARRAY[
      'screens_late',
      'caffeine_late',
      'evening_alcohol',
      'late_exercise',
      'racing_thoughts',
      'environment',
      'partner_or_kids',
      'nothing_obvious'
    ]::text[]
  ),

  -- Q3: schedule consistency. Bigger driver than total hours for many
  -- users — irregular schedules degrade sleep architecture even when
  -- total hours look fine.
  schedule_consistency text not null check (schedule_consistency in (
    'consistent_daily',
    'consistent_weekday_only',
    'inconsistent',
    'shift_work'
  )),

  -- Q4: what the user has already tried. Multi-select with no cap —
  -- the more the user has tried, the more we want to know so the
  -- report doesn't open with "have you tried no caffeine after 2pm"
  -- when the user already cut caffeine, screens, AND tried supplements.
  what_tried text[] not null check (
    array_length(what_tried, 1) >= 1
    and what_tried <@ ARRAY[
      'nothing_systematic',
      'caffeine_cutoffs',
      'screen_cutoffs',
      'supplements',
      'mindfulness_breathing',
      'multiple_things'
    ]::text[]
  ),

  -- Optional one-line free text. Same convention as hair_goal_text /
  -- style_goal_text / facial_hair_goal_text.
  sleep_goal_text text check (char_length(sleep_goal_text) <= 280),

  -- Generated report (markdown). Rendered via react-markdown on
  -- /plan/sleep, same shape as the other Pattern A reports.
  report_text text,
  report_generated_at timestamptz,
  report_model text,
  report_input_modifiers jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.sleep_assessments enable row level security;

create policy "sleep_assessments_select_own"
  on public.sleep_assessments for select
  using (auth.uid() = user_id);

create policy "sleep_assessments_insert_own"
  on public.sleep_assessments for insert
  with check (auth.uid() = user_id);

create policy "sleep_assessments_update_own"
  on public.sleep_assessments for update
  using (auth.uid() = user_id);
