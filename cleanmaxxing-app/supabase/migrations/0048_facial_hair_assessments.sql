-- ==========================================
-- Cleanmaxxing — facial_hair_assessments (Pattern A third topic, v0)
-- ==========================================
-- Mirrors style_assessments / hair_assessments structure deliberately —
-- one row per user, assessment columns + free text + report fields.
--
-- v0 scope: assessment + LLM-generated personal report. The 12 reference
-- styles in public/images/facial-hair-styles/ are surfaced as a visual
-- aid in the assessment but the assessment itself doesn't yet ask the
-- user to PICK a target style — that's a stage-1 expansion (analogue to
-- hair's cut_family picker) for a later migration.
--
-- Modifier sources read at report generation time:
--   user_profile.current_interventions (minoxidil shows up here and is
--     load-bearing for patchy growth recommendations)
--   users.age (density typically improves into late 20s / early 30s; the
--     report's expectation-setting depends on this)
--   hair_assessments.face_shape (when present — facial hair shape choices
--     interact with face shape, same way head-hair cut family does)
--
-- Run in Supabase SQL Editor.

create table if not exists public.facial_hair_assessments (
  user_id uuid primary key references public.users(id) on delete cascade,

  -- Q1: current state. Six values spanning the practical range from
  -- clean shaven to long beard. The user re-picks via the Edit answers
  -- flow if state changes.
  current_state text not null check (current_state in (
    'clean_shaven',
    'light_stubble',
    'heavy_stubble',
    'short_beard',
    'medium_beard',
    'long_beard'
  )),

  -- Q2: honest read on growth density. 'unsure' is allowed for users
  -- who've never grown long enough to know — the report handles that
  -- by recommending a 4-week grow-out before deciding direction.
  growth_quality text not null check (growth_quality in (
    'full',
    'mostly_full',
    'patchy',
    'very_patchy',
    'unsure'
  )),

  -- Q3: where the user wants to go. Drives the report's primary
  -- direction. 'not_sure_yet' is a valid answer; report leans into
  -- "here's how to figure that out" rather than picking for them.
  goal text not null check (goal in (
    'grow_more',
    'style_what_i_have',
    'try_new_style',
    'stay_clean',
    'not_sure_yet'
  )),

  -- Q4: realistic daily/weekly time commitment. Calibrates the
  -- recommendation register — 'low' = no styling products and no
  -- shaping, 'high' = barber visits and product routines.
  time_commitment text not null check (time_commitment in (
    'low',
    'medium',
    'high'
  )),

  -- Optional one-line free text. Same convention as hair_goal_text +
  -- style_goal_text.
  facial_hair_goal_text text check (char_length(facial_hair_goal_text) <= 280),

  -- Generated report (markdown). Rendered via react-markdown on
  -- /plan/facial-hair, same shape as hair / style reports.
  report_text text,
  report_generated_at timestamptz,
  report_model text,
  report_input_modifiers jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.facial_hair_assessments enable row level security;

create policy "facial_hair_assessments_select_own"
  on public.facial_hair_assessments for select
  using (auth.uid() = user_id);

create policy "facial_hair_assessments_insert_own"
  on public.facial_hair_assessments for insert
  with check (auth.uid() = user_id);

create policy "facial_hair_assessments_update_own"
  on public.facial_hair_assessments for update
  using (auth.uid() = user_id);
