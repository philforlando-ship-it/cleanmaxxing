-- ==========================================
-- Cleanmaxxing — style_assessments (Pattern A second topic, v0)
-- ==========================================
-- Mirrors hair_assessments structure deliberately. The point of this
-- table existing alongside hair is to validate the Pattern A framework
-- generalizes — same shape, different topic-specific columns.
--
-- v0 scope: assessment + LLM-generated personal report. Stages 1+ are
-- not in this migration. When they ship they'll layer columns onto
-- this table the same way hair stages 1–6 layered onto hair_assessments.
--
-- Modifier sources read at report generation time:
--   user_profile.bf_pct_self_estimate (frame correlate)
--   user_profile.budget_tier (recommendations scale)
--   user_profile.current_interventions (GLP-1 → expecting body change;
--     wardrobe should anticipate, not be redone for each phase)
--
-- Run in Supabase SQL Editor.

create table if not exists public.style_assessments (
  user_id uuid primary key references public.users(id) on delete cascade,

  -- Q1: frame self-estimate. Five values that span the practical range
  -- of male frame builds. The user can re-pick if their body comp
  -- shifts (which the Edit answers flow handles).
  frame_estimate text not null check (frame_estimate in (
    'slim', 'athletic', 'regular', 'broader', 'heavier'
  )),

  -- Q2: current archetype — what the user is dressing as TODAY,
  -- regardless of intent. Honest read.
  current_archetype text not null check (current_archetype in (
    'clean_minimalist',
    'athletic_casual',
    'rugged_masculine',
    'mature_professional',
    'streetwear',
    'creative_eclectic',
    'no_clear_archetype'
  )),

  -- Q3: target archetype — what the user is moving toward. The gap
  -- between current and target is the primary report driver.
  target_archetype text not null check (target_archetype in (
    'clean_minimalist',
    'athletic_casual',
    'rugged_masculine',
    'mature_professional',
    'streetwear',
    'creative_eclectic'
  )),

  -- Q4: closet state. Drives whether Stage 3 (when it ships) should
  -- focus on auditing existing pieces or building from scratch.
  closet_state text not null check (closet_state in (
    'well_curated',
    'functional',
    'outdated',
    'starting_from_scratch'
  )),

  -- Optional one-line free text. Same convention as hair_goal_text.
  style_goal_text text check (char_length(style_goal_text) <= 280),

  -- Generated report (markdown). Rendered via react-markdown on the
  -- /plan/style page, same shape as hair report.
  report_text text,
  report_generated_at timestamptz,
  report_model text,
  report_input_modifiers jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.style_assessments enable row level security;

create policy "style_assessments_select_own"
  on public.style_assessments for select
  using (auth.uid() = user_id);

create policy "style_assessments_insert_own"
  on public.style_assessments for insert
  with check (auth.uid() = user_id);

create policy "style_assessments_update_own"
  on public.style_assessments for update
  using (auth.uid() = user_id);
