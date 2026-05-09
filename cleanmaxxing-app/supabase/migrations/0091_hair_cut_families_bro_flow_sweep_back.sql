-- ==========================================
-- Cleanmaxxing — extend cut_family with bro_flow + classic_sweep_back
-- ==========================================
-- Two additions identified from a 2026-05-08 catalog audit. Each is a
-- distinct silhouette that wasn't cleanly served by the existing 22:
--
--   bro_flow — medium-length flow, no part, hair pushed back/up with
--     hands-only styling. Distinct from wolf_cut (which carries
--     shag/youth attitude), slick_back (which is heavy in product),
--     and curtains (which has a center-fall middle part). Reads
--     cleaner and more mature than wolf_cut. Density-required.
--
--   classic_sweep_back — short-to-medium clean sweep, no defined part,
--     less product than slick_back. The "executive flow" silhouette.
--     Mature hairline-friendly. Distinct from slick_back (lighter
--     hold, more natural texture) and ivy_league (no taper emphasis).
--
-- Both surface user-named cultural references in
-- lib/hair/types.ts CUT_FAMILY_REFERENCES (Joe Goldberg / generic
-- "Bro Flow" for bro_flow; "Business Flow" / "Executive Sweep" for
-- classic_sweep_back).
--
-- Existing rows are not affected; adding values to the allowed set is
-- a non-breaking schema change. Image catalog: bro_flow.png and
-- classic_sweep_back.png need to be generated and dropped into
-- public/images/cut-families/ in a follow-up — the hair components
-- gracefully degrade to text-only when image files are missing.
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
    'clean_shave',
    'bro_flow',
    'classic_sweep_back'
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
    'clean_shave',
    'bro_flow',
    'classic_sweep_back'
  ));
