-- ==========================================
-- Cleanmaxxing — extend cut_family with pompadour + bald_fade + short_fade
-- ==========================================
-- Three additions surfaced by the 2026 image catalog audit. Each is a
-- distinct silhouette, not a variant of an existing cut:
--
--   pompadour — volume-on-top with a fade or low taper. Distinct from
--     slick_back (which has no significant height) and slick_back_undercut
--     (which is slicked flat-back, not lifted). Density-required (volume
--     needs hair to carry it). Cross-age — reads 25-50 cleanly.
--
--   bald_fade — deliberately shaved scalp with a fade transition into
--     the beard or head. Distinct from bald_track (transitioning, less
--     intentional) and clean_shave (smooth all the way down with no
--     fade structure). Cross-age. Surfaces in shaved_or_buzzed and
--     advanced_thinning density.
--
--   short_fade — balding-friendly very-short top with a fade transition,
--     less aggressive than buzz, more shaped than crew. Specifically a
--     receding/thinning option — only surfaces when density signals
--     active recession. Cross-age.
--
-- Existing rows are not affected; adding values to the allowed set is a
-- non-breaking schema change.
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
    'slick_back_undercut',
    'curtains',
    'textured_fringe',
    'overgrown_buzz',
    'broccoli',
    'wolf_cut',
    'modern_mullet',
    'side_part_combover',
    'pompadour',
    'bald_fade',
    'short_fade',
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
    'slick_back_undercut',
    'curtains',
    'textured_fringe',
    'overgrown_buzz',
    'broccoli',
    'wolf_cut',
    'modern_mullet',
    'side_part_combover',
    'pompadour',
    'bald_fade',
    'short_fade',
    'bald_track',
    'clean_shave'
  ));
