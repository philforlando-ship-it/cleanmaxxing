-- ==========================================
-- Cleanmaxxing — extend cut_family with 7 modern + balding cuts
-- ==========================================
-- Adds the cuts that were genuinely missing from the v1 12-cut roster
-- after a 2026 catalog audit. Three categories:
--
-- Cross-age modern:
--   slick_back_undercut — Jimmy Darmody / Tommy Shelby. Distinct from
--     existing slick_back (which has even tapered sides, no contrast).
--     Hard sides + long slicked-back top. 25-50 cohort.
--   textured_fringe — Peaky Blinders fringe variant. Distinct from
--     curtains (middle-part flow). Fringe pushed forward over the
--     brow with a low fade. 22-40 cohort.
--   overgrown_buzz — modern buzz with more length on top, less
--     military than the existing buzz_cut. Cross-age.
--
-- Youth-coded (gated by age filter, not just density):
--   broccoli — tight fade + curly/textured volume on top. Reads
--     Gen Z. 18-30.
--   wolf_cut — shaggy/layered/flow, mullet-adjacent. Distinct from
--     slick_back_undercut (where I'd previously conflated them).
--     Fashion-forward. 20-32.
--   modern_mullet — low-taper graduated mullet, not 80s. 22-35.
--
-- Balding-friendly addition:
--   side_part_combover — soft option for early recession users who
--     don't yet want to commit to caesar/buzz. Surfaces only on
--     mature_hairline + receding_hairline density states.
--
-- The cohort gating happens in lib/hair/cut-by-age.ts (new module
-- this migration ships alongside). Final menu = density-appropriate
-- ∩ age-appropriate.
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
    'slick_back_undercut',
    'curtains',
    'textured_fringe',
    'overgrown_buzz',
    'broccoli',
    'wolf_cut',
    'modern_mullet',
    'side_part_combover',
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
    'bald_track',
    'clean_shave'
  ));
