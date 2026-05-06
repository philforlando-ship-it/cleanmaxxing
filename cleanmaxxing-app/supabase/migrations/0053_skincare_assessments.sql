-- ==========================================
-- Cleanmaxxing — skincare_assessments (Pattern A fifth topic, v0)
-- ==========================================
-- Mirrors hair / style / facial_hair / sleep assessment table shape.
-- One row per user, assessment columns + free text + report fields.
--
-- Relationship to user_profile.skin_type:
--   user_profile.skin_type carries the Fitzpatrick scale (1-6, sun
--   reaction) collected on /profile. The assessment captures
--   skin_behavior — what the skin DOES day-to-day (oily / dry /
--   combo / sensitive / normal). Both are useful and orthogonal:
--   Fitzpatrick informs sun protection + retinoid tolerance +
--   hyperpigmentation risk; behavior informs cleanser type +
--   moisturizer weight.
--
-- Modifier sources read at report generation time:
--   user_profile.skin_type (Fitzpatrick — modifier for sun /
--     retinoid / pigmentation guidance)
--   user_profile.current_interventions (accutane is the big one;
--     active accutane fundamentally changes the routine)
--   user_profile.budget_tier (drugstore vs prestige register)
--   users.age (collagen + retinoid tolerance shift with age)
--
-- Run in Supabase SQL Editor.

create table if not exists public.skincare_assessments (
  user_id uuid primary key references public.users(id) on delete cascade,

  -- Q1: skin behavior — what your skin DOES day to day. Distinct from
  -- the profile-level Fitzpatrick scale.
  skin_behavior text not null check (skin_behavior in (
    'oily',
    'dry',
    'combo',
    'sensitive',
    'normal',
    'not_sure'
  )),

  -- Q2: the primary concern the user wants the plan to address. ONE
  -- focus per plan; multi-concern users get the strongest signal first
  -- and can re-pick via Edit answers.
  primary_concern text not null check (primary_concern in (
    'acne',
    'aging',
    'uneven_tone',
    'dullness',
    'sensitivity_redness',
    'dryness',
    'nothing_specific'
  )),

  -- Q3: where the user is on the routine spectrum today. Calibrates
  -- the recommendation — telling someone with a 12-step routine to
  -- "add cleanser" is wrong, and so is dropping a 6-product stack on
  -- someone who currently splashes water.
  current_routine text not null check (current_routine in (
    'none',
    'cleanser_only',
    'cleanser_moisturizer',
    'full_routine',
    'overcomplicated'
  )),

  -- Q4: realistic daily sun exposure. Drives sunscreen recommendation
  -- aggressiveness + (with Fitzpatrick) hyperpigmentation framing.
  sun_exposure text not null check (sun_exposure in (
    'minimal_indoor',
    'moderate',
    'heavy_outdoor'
  )),

  -- Optional one-line free text. Same convention as the other
  -- Pattern A topics.
  skincare_goal_text text check (char_length(skincare_goal_text) <= 280),

  -- Generated report (markdown). Rendered via react-markdown on
  -- /plan/skincare, same shape as the other Pattern A reports.
  report_text text,
  report_generated_at timestamptz,
  report_model text,
  report_input_modifiers jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.skincare_assessments enable row level security;

create policy "skincare_assessments_select_own"
  on public.skincare_assessments for select
  using (auth.uid() = user_id);

create policy "skincare_assessments_insert_own"
  on public.skincare_assessments for insert
  with check (auth.uid() = user_id);

create policy "skincare_assessments_update_own"
  on public.skincare_assessments for update
  using (auth.uid() = user_id);
