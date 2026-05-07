-- ==========================================
-- Cleanmaxxing — add `caesar` and `high_taper_crop` to cut_family
-- ==========================================
-- The current 10-cut roster underserves the actively-balding cohort
-- (receding_hairline, crown_thinning, diffuse_thinning). Two cuts
-- specifically designed for thinning hair are missing:
--
--   caesar — short forward-combed fringe, low height, low taper.
--     The fringe is the entire point: it disguises a receding
--     hairline by making "short pushed forward" the visual story.
--     Distinct from textured_crop (which is taller, has more
--     volume, and reads as a styled crop rather than a Caesar).
--
--   high_taper_crop — very high taper or skin fade with a short
--     cropped top under an inch. The visual line of the taper sits
--     well above the ear, eliminating the contrast that makes
--     thinning sides visible. Distinct from crew_cut (which has a
--     classic taper, athletic register, and isn't fade-driven).
--
-- The lib/hair/cut-by-density.ts module wires these into the
-- density-filtered menu surfaced to the user on Stage 1. The
-- generator prompt also changes to constrain the LLM to the
-- density-appropriate subset rather than relying on "avoid X" hints.
--
-- Existing rows are not affected; adding values to the allowed set
-- is a non-breaking schema change.
--
-- Run in Supabase SQL Editor.

alter table public.hair_assessments
  drop constraint if exists hair_assessments_stage_1_cut_family_check;

alter table public.hair_assessments
  add constraint hair_assessments_stage_1_cut_family_check
  check (stage_1_cut_family in (
    'caesar',
    'high_taper_crop',
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
    'caesar',
    'high_taper_crop',
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
