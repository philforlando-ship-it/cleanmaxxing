-- ==========================================
-- Cleanmaxxing — style_assessments v2 granular body dimensions
-- ==========================================
-- Style v2 reframe (2026-05-09). The v1 frame_estimate single-field
-- (slim/athletic/regular/broader/heavier) is too coarse to drive
-- silhouette recommendations the way POV 12's Guzy + RMRS framework
-- expects. v2 adds five granular fields so the assessment can serve
-- the body-first hierarchy: body axes drive silhouette rules, then
-- archetype, then taste.
--
-- Fields added:
--   shoulder_width    narrow / medium / broad
--                     — primary silhouette driver per Guzy/RMRS
--   arm_length        short / proportional / long
--                     — drives sleeve / cuff visibility rules
--   leg_length        short / proportional / long
--                     — drives torso-to-leg ratio (the "highest
--                     leverage proportion lever" per Gentleman's
--                     Gazette: high-rise trousers for long-torso/
--                     short-legs)
--   build             slight / athletic / stocky / heavyset
--                     — distinct from shoulder_width (a stocky
--                     short-broad man dresses differently from a
--                     muscular tall-broad man)
--   skin_undertone    cool / warm / neutral
--                     — for the personal-undertone color framework
--                     (proxy via jewelry test in form)
--
-- frame_estimate is RETAINED as a legacy field. The v2 form derives
-- it from build + shoulder_width on submit so the 9 downstream call
-- sites (cut menu density, foundation pieces content, prompt rules
-- branched on frame_estimate) continue working unchanged.
--
-- All five new fields nullable so pre-migration rows stay valid; the
-- form requires them on next submit.
--
-- Run in Supabase SQL Editor.

alter table public.style_assessments
  add column if not exists shoulder_width text
    check (shoulder_width is null or shoulder_width in (
      'narrow',
      'medium',
      'broad'
    )),
  add column if not exists arm_length text
    check (arm_length is null or arm_length in (
      'short',
      'proportional',
      'long'
    )),
  add column if not exists leg_length text
    check (leg_length is null or leg_length in (
      'short',
      'proportional',
      'long'
    )),
  add column if not exists build text
    check (build is null or build in (
      'slight',
      'athletic',
      'stocky',
      'heavyset'
    )),
  add column if not exists skin_undertone text
    check (skin_undertone is null or skin_undertone in (
      'cool',
      'warm',
      'neutral'
    ));
