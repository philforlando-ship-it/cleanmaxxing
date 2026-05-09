-- ==========================================
-- Cleanmaxxing — style_assessments: frame_density axis
-- ==========================================
-- Adds a second body-composition axis orthogonal to `build`. The
-- v2 build axis (slight / athletic / stocky / heavyset) collapsed
-- four real combinations into the wrong number of buckets — most
-- prominently the gap between athletic and stocky:
--
--   "broad athletic" / mesomorph — broader frame than runner-
--   athletic, but with developed muscle and low BF (powerlifters,
--   ex-football players). They picked athletic and lost the broad
--   frame information, OR picked stocky and lost the muscle.
--
-- frame_density is the orthogonal axis that resolves it without
-- exploding the build enum:
--
--   lean    — low body fat, lines visible, no soft cover
--   dense   — visible muscle, tight skin, weight reads as muscle
--   soft    — has a layer over the underlying frame; not heavyset,
--             just not lean
--
-- Combined with build, the 4 × 3 grid expresses what one axis
-- couldn't:
--   athletic + lean   → wiry / runner / climber
--   athletic + dense  → broad-athletic / mesomorph (the missing
--                        bucket between athletic and stocky)
--   athletic + soft   → athletic-with-a-layer (dad-bod-with-history)
--   stocky + dense    → short-broad with developed muscle
--   stocky + soft     → traditional stocky (current prescription)
--   slight + lean     → wiry / climber-slight
--   ...etc.
--
-- Nullable so pre-migration rows stay valid; the form requires it
-- on next submit. Prompts branch only when the field is set.
--
-- Run in Supabase SQL Editor.

alter table public.style_assessments
  add column if not exists frame_density text
    check (frame_density is null or frame_density in (
      'lean',
      'dense',
      'soft'
    ));
