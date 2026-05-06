-- ==========================================
-- Cleanmaxxing — hair_assessments
-- ==========================================
-- One row per user. Stores the four-question assessment that gates the
-- hair plan, plus the LLM-generated personal report. v0 of the
-- hair-as-Pattern-A shakeout: assessment in, report out.
--
-- Why one row per user (user_id as PK rather than a separate id column):
-- the assessment is the user's current self-description, not a log.
-- A re-assessment overwrites in place; if we want history later we'll
-- split into hair_assessments + hair_assessment_history.
--
-- Why NOT extending user_profile: the columns here are journey-scoped
-- (face_shape, density_state, hair_type_*) rather than cross-cutting
-- profile facts. Mister P doesn't need them in his global user-state
-- block — they only matter inside the hair plan context. Keeping the
-- table separate also means we can drop and re-add it during v0
-- iteration without touching the profile schema.
--
-- Hair-loss treatment status is NOT captured here — it lives in
-- user_profile.current_interventions (finasteride / minoxidil). The
-- report generator reads both tables and wires fin/min as a modifier.
--
-- Run in Supabase SQL Editor.

create table if not exists public.hair_assessments (
  user_id uuid primary key references public.users(id) on delete cascade,

  -- Q1: face shape. Five options — heart/triangle added beyond the
  -- POV's original four for completeness. Replaced eventually by photo
  -- analysis once Mister P's photo access lands.
  face_shape text not null check (face_shape in (
    'oval', 'round', 'square', 'long_rectangular', 'heart_triangle'
  )),

  -- Q2: density state. Routes the report. The 'shaved_or_buzzed' option
  -- is the bald-track exit — the plan switches into scalp-care + beard
  -- + style framing rather than cut/style optimization.
  density_state text not null check (density_state in (
    'full',
    'mature_hairline',
    'receding_hairline',
    'crown_thinning',
    'diffuse_thinning',
    'advanced_thinning',
    'shaved_or_buzzed'
  )),

  -- Q3: hair type. Three sub-fields. POV section §"Product and hair
  -- type matching" branches on the (strand, pattern) pair; density is
  -- separate from strand thickness — fine hair is not the same as
  -- thinning hair, and confusing the two is the most common product
  -- mismatch.
  hair_type_strand text not null check (hair_type_strand in (
    'fine', 'medium', 'thick_coarse'
  )),
  hair_type_pattern text not null check (hair_type_pattern in (
    'straight', 'wavy', 'curly', 'coily'
  )),
  hair_type_density text not null check (hair_type_density in (
    'low', 'medium', 'high'
  )),

  -- Q4: current routine. jsonb so the shape can evolve during v0 without
  -- a migration per tweak. Shape: { cut_cadence_weeks: int|null,
  -- products_used: text|null, uses_blow_dry: bool, who_cuts: text|null }.
  current_routine jsonb not null default '{}'::jsonb,

  -- Optional one-line free text. The user's words on what they want.
  -- Surfaces in the report prompt as additional context. Capped to keep
  -- prompt budget predictable.
  hair_goal_text text check (char_length(hair_goal_text) <= 280),

  -- Generated report. Plain prose with markdown headings, rendered via
  -- react-markdown on /plan/hair. Null until first generation succeeds.
  report_text text,
  report_generated_at timestamptz,
  -- Provenance: which model produced the report, and a snapshot of the
  -- modifier inputs (hair_status, current_interventions) so we can tell
  -- whether a profile change has invalidated the rendered text.
  report_model text,
  report_input_modifiers jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.hair_assessments enable row level security;

create policy "hair_assessments_select_own"
  on public.hair_assessments for select
  using (auth.uid() = user_id);

create policy "hair_assessments_insert_own"
  on public.hair_assessments for insert
  with check (auth.uid() = user_id);

create policy "hair_assessments_update_own"
  on public.hair_assessments for update
  using (auth.uid() = user_id);
