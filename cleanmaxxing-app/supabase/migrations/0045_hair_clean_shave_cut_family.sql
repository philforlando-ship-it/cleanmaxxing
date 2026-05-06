-- ==========================================
-- Cleanmaxxing — add `clean_shave` to the cut_family enum set
-- ==========================================
-- The existing `bald_track` value collapses two distinct presentations
-- into one: a fully razor-shaved (Bic'd) head and a transitional /
-- maintenance-shaved bald presentation. They have different
-- commitment levels and different maintenance cadences (daily razor
-- vs. every-3-to-10-day buzz), and the audience for this journey
-- skews toward men experiencing actual baldness — distinguishing the
-- razor-smooth look earns its place in the enum.
--
-- Existing rows are not affected; adding a value to the allowed set is
-- a non-breaking schema change.
--
-- The constraints being modified were created inline in the original
-- migrations (0036 for hair_assessments, 0044 for hair_try_ons), which
-- gives them Postgres' default `<table>_<column>_check` names.
--
-- Run in Supabase SQL Editor.

alter table public.hair_assessments
  drop constraint if exists hair_assessments_stage_1_cut_family_check;

alter table public.hair_assessments
  add constraint hair_assessments_stage_1_cut_family_check
  check (stage_1_cut_family in (
    'textured_crop',
    'ivy_league',
    'textured_quiff',
    'mid_length_textured',
    'crew_cut',
    'buzz_cut',
    'slick_back',
    'curtains',
    'bald_track',
    'clean_shave'
  ));

alter table public.hair_try_ons
  drop constraint if exists hair_try_ons_cut_family_check;

alter table public.hair_try_ons
  add constraint hair_try_ons_cut_family_check
  check (cut_family in (
    'textured_crop',
    'ivy_league',
    'textured_quiff',
    'mid_length_textured',
    'crew_cut',
    'buzz_cut',
    'slick_back',
    'curtains',
    'bald_track',
    'clean_shave'
  ));
