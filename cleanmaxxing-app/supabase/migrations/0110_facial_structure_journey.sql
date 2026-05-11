-- ==========================================
-- Cleanmaxxing — facial_structure journey (Pattern A, ninth topic)
-- ==========================================
-- New journey for the facial structure layer of looksmaxxing — chin
-- projection, jaw definition, cheekbone visibility, face shape framing.
-- Grounded in POV 16 (facial-definition-jawline) primary, with read
-- support from POV 50 (posture), POV 13 (body comp), POV 28 (cosmetic
-- procedures), POV 38 (aging-related structural drift), POV 44 (facial
-- puff troubleshooting), POV 18 (tanning for contrast), POV 33 (mewing
-- contextualization), POV 06 (bone-smashing hard-no).
--
-- Architectural decisions for v1:
-- * Pattern A 4-stage: Stage 1 baseline diagnosis → Stage 2 primary
--   lever execution → Stage 3 framing layer → Stage 4 Pattern D cosmetic
--   shell (deep-links to existing /plan/procedures, not duplicated here).
-- * Posture ownership stays with POV 50 — facial_structure READS
--   posture state and surfaces facial-specific implications, doesn't
--   own the protocol. Neck training is the exception (POV 13/16 frame
--   it as a facial-aesthetic lever) and lives here.
-- * Mewing = mention only, no tracked practice. POV 13 finding:
--   "posture correction alone delivers 80% of what people believe
--   mewing accomplishes."
-- * Body comp coupling = read-only panel + deep-link to /plan/nutrition.
--
-- Mirrors hair / style / facial_hair / sleep / skincare / nutrition /
-- strength / cardio assessment table shape. One row per user.
--
-- The journey_states slug constraint must accept 'facial_structure'
-- before any sync can write a row — both DDL statements live in this
-- migration so they apply atomically.
--
-- Run in Supabase SQL Editor.

-- 1) Extend journey_states.journey_slug constraint
alter table public.journey_states
  drop constraint if exists journey_states_journey_slug_check;

alter table public.journey_states
  add constraint journey_states_journey_slug_check
  check (journey_slug in (
    'hair',
    'style',
    'body_composition',
    'strength',
    'cardio',
    'sleep',
    'skincare',
    'facial_hair',
    'facial_structure'
  ));

-- 2) Create facial_structure_assessments
create table if not exists public.facial_structure_assessments (
  user_id uuid primary key references public.users(id) on delete cascade,

  -- Q1: body_fat_estimate — gates the primary lever. 10-15% is POV 16's
  -- stated optimal facial-definition band; over 20% routes hard into
  -- body_composition before any facial work is meaningful.
  body_fat_estimate text not null check (body_fat_estimate in (
    'under_12',
    '12_to_15',
    '15_to_20',
    '20_to_25',
    'over_25'
  )),

  -- Q2: face_first_distribution — the POV 16 self-test. Calibrates the
  -- user's personal BF target. Face-first distributors get sharp at
  -- higher BF; face-softer distributors need to push leaner.
  face_first_distribution text not null check (face_first_distribution in (
    'face_sharper_than_body',
    'face_matches_body',
    'face_softer_than_body',
    'not_sure'
  )),

  -- Q3: postural_pattern — multi-select. Values validated at the
  -- service layer (Postgres array element check constraints are
  -- awkward; see lib/facial-structure/types.ts). Drives the posture
  -- read-from-POV-50 framing, plus the neck training prescription.
  -- Allowed values: 'forward_head' | 'rounded_shoulders' |
  -- 'anterior_pelvic_tilt' | 'none_apparent' | 'unsure'.
  postural_pattern text[] not null,

  -- Q4: chin_jaw_concern — diagnostic for which facial-structure
  -- sub-region the user is focused on. Chin vs jaw is a system per
  -- POV 16: chin = side profile, jaw = front/three-quarter. Submental
  -- fullness routes to the puff/sleep diagnostic OR cosmetic shell
  -- depending on baseline state.
  chin_jaw_concern text not null check (chin_jaw_concern in (
    'chin_projection_side',
    'jaw_definition_front',
    'chin_neck_transition',
    'submental_fullness',
    'overall_softness',
    'no_specific_concern'
  )),

  -- Q5: facial_puff_baseline — gates the POV 44 troubleshooting
  -- frame. Persistent morning puff in an otherwise-lean user is a
  -- sleep / sodium / alcohol diagnostic, not a structural problem.
  facial_puff_baseline text not null check (facial_puff_baseline in (
    'rarely',
    'few_days_per_month',
    'most_mornings',
    'persistent'
  )),

  -- Q6: cosmetic_procedure_openness — gates whether Stage 4 surfaces
  -- the Pattern D shell at all. 'already_done' users still get Stage
  -- 4 but the framing shifts to "what's next / longevity / touch-ups."
  cosmetic_procedure_openness text not null check (cosmetic_procedure_openness in (
    'not_open',
    'curious_about_options',
    'actively_considering',
    'already_done'
  )),

  -- Free text (optional context, surfaced to report-prompt as
  -- additional_context).
  notes text,

  -- Report fields (mirror hair / style / nutrition shape).
  report_text text,
  report_generated_at timestamptz,
  report_input_modifiers jsonb,
  report_model text,
  report_input_tokens int,
  report_output_tokens int,

  -- Stage state. Stage 4 has TWO timestamps because it's unlock-gated:
  -- stage_4_unlocked_at is set by server logic when (Stage 2 done AND
  -- cosmetic_procedure_openness >= curious). stage_4_acknowledged_at
  -- is the user's explicit acknowledgment that they've engaged with
  -- the cosmetic content (deep-link to /plan/procedures).
  stage_1_acknowledged_at timestamptz,
  stage_2_started_at timestamptz,
  stage_2_completed_at timestamptz,
  stage_3_acknowledged_at timestamptz,
  stage_4_unlocked_at timestamptz,
  stage_4_acknowledged_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists facial_structure_assessments_user_idx
  on public.facial_structure_assessments(user_id);

alter table public.facial_structure_assessments enable row level security;

create policy "facial_structure_assessments_select_own"
  on public.facial_structure_assessments for select
  using (auth.uid() = user_id);

create policy "facial_structure_assessments_insert_own"
  on public.facial_structure_assessments for insert
  with check (auth.uid() = user_id);

create policy "facial_structure_assessments_update_own"
  on public.facial_structure_assessments for update
  using (auth.uid() = user_id);

create policy "facial_structure_assessments_delete_own"
  on public.facial_structure_assessments for delete
  using (auth.uid() = user_id);
