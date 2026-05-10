-- ==========================================
-- Cleanmaxxing — style_assessments: eye_color axis
-- ==========================================
-- Eye color is the universal-applicable color tiebreak signal —
-- works for bald users (the hair-color tiebreak in 0093's
-- skin_undertone neutral guidance excluded a meaningful slice of
-- the over-35 audience), works for clean-shaven users (where the
-- beard-color tiebreak doesn't fire), and gives the AI report a
-- per-user color direction even when skin_undertone is the
-- ambiguous 'neutral' bucket.
--
-- Six values chosen to balance precision against form friction.
-- Mapping to undertone direction (consumed by ColorPaletteCard +
-- the style report-prompt modifier block):
--
--   blue       → cool (clear)
--   grey       → cool (clear)
--   green      → neutral (genuinely doesn't lean either way; the
--                user falls back to the default balanced palette)
--   hazel      → warm (the warm-shifting greens-with-amber bucket)
--   brown      → warm (medium/light brown reads warm in classic
--                undertone framework)
--   dark_brown → warm (very dark brown reads warm; near-black eyes
--                are extremely common globally and the default
--                lean is warm per RMRS / Gentleman's Gazette)
--
-- Nullable so pre-migration rows stay valid; the form requires it
-- on next submit. Consumers no-op when null.
--
-- Run in Supabase SQL Editor.

alter table public.style_assessments
  add column if not exists eye_color text
    check (eye_color is null or eye_color in (
      'blue',
      'grey',
      'green',
      'hazel',
      'brown',
      'dark_brown'
    ));
