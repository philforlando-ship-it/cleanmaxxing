-- ==========================================
-- Cleanmaxxing — hair_assessments Stage 1 columns (cut strategy)
-- ==========================================
-- Stage 1 of the Pattern A hair plan: pick a cut family + write the
-- barber instructions for the user. The recommendation is generated
-- by Mister P from the assessment + the personal report; the user
-- gates the stage by marking the cut as done.
--
-- Schema decisions:
-- * Stage state lives on hair_assessments rather than a separate
--   stages table. v1 simplicity — when stages 2+ ship and the columns
--   start to multiply, we can split. The framework memory says
--   "1–3 domain tables/columns specific to that topic" is fine.
-- * cut_family is constrained to the 9 named families (8 cuts + the
--   bald-track exit for shaved_or_buzzed users). If the LLM picks a
--   value outside the set, the route handler fails the constraint
--   loudly rather than silently writing junk.
-- * stage_1_completed_at is the gate for stage 2. Null until the user
--   confirms the cut happened (the event-gated progression model).
--
-- Run in Supabase SQL Editor.

alter table public.hair_assessments
  add column if not exists stage_1_cut_family text check (stage_1_cut_family in (
    'textured_crop',
    'ivy_league',
    'textured_quiff',
    'mid_length_textured',
    'crew_cut',
    'buzz_cut',
    'slick_back',
    'curtains',
    'bald_track'
  )),
  add column if not exists stage_1_barber_text text,
  add column if not exists stage_1_generated_at timestamptz,
  add column if not exists stage_1_completed_at timestamptz;
