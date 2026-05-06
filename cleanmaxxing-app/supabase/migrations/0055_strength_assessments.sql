-- ==========================================
-- Cleanmaxxing — strength_assessments (Pattern A seventh topic, v0)
-- ==========================================
-- Mirrors the other Pattern A assessment table shape. Lives in
-- the trio with nutrition (0054) and the future cardio plan —
-- each cross-modifier-aware via the others' assessments + data.
--
-- Voice posture (codified in lib/strength/report-prompt.ts):
--   - Hypertrophy-first framing (Israetel): 5-12 reps, 1-2 RIR,
--     MEV/MAV/MRV, full ROM with stretch emphasis
--   - Age-tiered prescription (18-29 build, 30-39 optimization,
--     40+ longevity) — different rep ranges, deload cadence,
--     exercise emphasis
--   - 40+ Nine non-negotiables surfaced as guardrails for that cohort
--   - Glutes-after-35 rule
--   - Cross-modifier: nutrition's goal_direction (cut → preserve
--     muscle, bulk → push volume, recomp → high frequency)
--
-- Modifier sources read at report generation time:
--   user_profile.training_experience (none → over_10y; drives
--     beginner-ramp vs main framework decision)
--   user_profile.daily_training_minutes
--   user_profile.activity_level
--   user_profile.bf_pct_self_estimate (informs whether to anchor
--     on cut / recomp / bulk if nutrition assessment isn't done)
--   user_profile.current_interventions (TRT, GLP-1, creatine all
--     matter — TRT changes recomp realism, GLP-1 forces muscle
--     preservation framing, creatine shifts performance ceiling)
--   users.age (drives the age-tier framework — load-bearing)
--   nutrition_assessments.goal_direction (when present — pulls
--     the nutrition prescription's cut/recomp/bulk into the
--     strength prescription so the two stay aligned)
--   workout_logs (last 14 days strength session frequency as the
--     live data signal)
--
-- Run in Supabase SQL Editor.

create table if not exists public.strength_assessments (
  user_id uuid primary key references public.users(id) on delete cascade,

  -- Q1: primary goal. 'size' is the default looksmaxxing target
  -- (hypertrophy). 'strength' biases toward lower-rep heavier work.
  -- 'both' is the realistic answer for most lifters; 'general_fitness'
  -- shifts emphasis to consistency over progression.
  primary_goal text not null check (primary_goal in (
    'size',
    'strength',
    'both',
    'general_fitness',
    'not_sure'
  )),

  -- Q2: days per week available. Drives split selection — 2-3 days
  -- pushes full-body, 4 days fits upper/lower, 5 days unlocks the
  -- aesthetic split.
  days_per_week text not null check (days_per_week in (
    '2_days',
    '3_days',
    '4_days',
    '5_days',
    '6_days'
  )),

  -- Q3: equipment access. Drives exercise vocabulary. Bodyweight
  -- and minimal-dumbbell users get a different recommendation
  -- catalog than full-gym users.
  equipment_access text not null check (equipment_access in (
    'full_commercial_gym',
    'home_rack_bench',
    'minimal_dumbbells',
    'bodyweight_only'
  )),

  -- Q4: current split / training pattern. Tells the report whether
  -- the user is starting cold or maintaining an existing structure.
  -- 'none_or_inconsistent' triggers the beginner-ramp framing
  -- regardless of training_experience self-report.
  current_split text not null check (current_split in (
    'none_or_inconsistent',
    'full_body',
    'upper_lower',
    'push_pull_legs',
    'bro_split',
    '5_day_aesthetic',
    'other'
  )),

  -- Optional one-line free text. Same convention as the other
  -- Pattern A topics.
  strength_goal_text text check (char_length(strength_goal_text) <= 280),

  -- Generated report (markdown).
  report_text text,
  report_generated_at timestamptz,
  report_model text,
  report_input_modifiers jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.strength_assessments enable row level security;

create policy "strength_assessments_select_own"
  on public.strength_assessments for select
  using (auth.uid() = user_id);

create policy "strength_assessments_insert_own"
  on public.strength_assessments for insert
  with check (auth.uid() = user_id);

create policy "strength_assessments_update_own"
  on public.strength_assessments for update
  using (auth.uid() = user_id);
