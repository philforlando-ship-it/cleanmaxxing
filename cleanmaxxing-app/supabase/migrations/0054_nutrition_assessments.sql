-- ==========================================
-- Cleanmaxxing — nutrition_assessments (Pattern A sixth topic, v0)
-- ==========================================
-- Mirrors the other Pattern A assessment tables. One row per user,
-- assessment columns + free text + report fields.
--
-- Voice posture from 0025_nutrition_logs (the existing felt-sense
-- protein logger): we are NOT a macro-tracker product. The plan
-- respects that — recommendations lean on felt-sense protein floor +
-- a few high-leverage moves, NOT a TDEE calculator and macro split.
-- Users who want gram-counting can do that on their own; the report
-- gives them the math principles without stage-directing.
--
-- Modifier sources read at report generation time:
--   user_profile.bf_pct_self_estimate (where the user is now)
--   user_profile.current_weight_lbs + height_inches (BMI-adjacent
--     context for the LLM, not a number we surface back)
--   user_profile.activity_level + daily_training_minutes (training
--     volume context — informs whether the prescription is cut /
--     recomp / bulk-friendly)
--   user_profile.training_experience (beginner-recomp window vs
--     advanced trainee constraints)
--   user_profile.diet_restrictions (free text user-supplied)
--   user_profile.current_interventions (GLP-1, creatine, TRT, SSRI
--     all matter — esp. GLP-1 which forces a caloric deficit and
--     makes muscle preservation the headline)
--   users.age (BMR / sarcopenia framing — protein floor goes up past 50)
--   nutrition_logs (rolling 14-day protein-target hit rate as the
--     live data signal — the report can name "you've hit protein
--     X/14 days" the way the sleep report names rolling avg hours)
--
-- Run in Supabase SQL Editor.

create table if not exists public.nutrition_assessments (
  user_id uuid primary key references public.users(id) on delete cascade,

  -- Q1: goal direction. ONE primary direction per plan. Recomp is its
  -- own option (same weight, fat down + muscle up) because it has a
  -- meaningfully different prescription than cut or bulk.
  goal_direction text not null check (goal_direction in (
    'lose_fat',
    'recomp',
    'gain_muscle',
    'maintain',
    'not_sure'
  )),

  -- Q2: timeline / urgency. 'aggressive_short_term' triggers honest
  -- framing about the trade-offs (more muscle loss risk, more friction,
  -- harder to maintain). 'no_timeline' allows the most sustainable
  -- prescription.
  urgency text not null check (urgency in (
    'aggressive_short_term',
    'steady_6_to_12_months',
    'no_timeline'
  )),

  -- Q3: eating context. The single biggest predictor of whether a
  -- plan can actually be followed. 'mostly_liquid_or_shakes' triggers
  -- a flag — sometimes signal of an eating problem, sometimes just a
  -- bodybuilder pattern; report handles both honestly.
  eating_context text not null check (eating_context in (
    'cook_most_meals',
    'mixed_cook_and_outside',
    'mostly_outside_delivery',
    'mostly_liquid_or_shakes',
    'inconsistent'
  )),

  -- Q4: what the user has already tried. Calibrates whether the
  -- recommendation should open with the basics or aim higher.
  what_tried text not null check (what_tried in (
    'nothing_systematic',
    'counted_macros',
    'restrictive_diet',
    'glp1_or_pharma',
    'multiple_things'
  )),

  -- Optional one-line free text. Same convention as the other
  -- Pattern A topics.
  nutrition_goal_text text check (char_length(nutrition_goal_text) <= 280),

  -- Generated report (markdown).
  report_text text,
  report_generated_at timestamptz,
  report_model text,
  report_input_modifiers jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.nutrition_assessments enable row level security;

create policy "nutrition_assessments_select_own"
  on public.nutrition_assessments for select
  using (auth.uid() = user_id);

create policy "nutrition_assessments_insert_own"
  on public.nutrition_assessments for insert
  with check (auth.uid() = user_id);

create policy "nutrition_assessments_update_own"
  on public.nutrition_assessments for update
  using (auth.uid() = user_id);
