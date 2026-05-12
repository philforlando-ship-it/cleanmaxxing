-- ==========================================
-- Cleanmaxxing — facial_structure photo-baseline features
-- ==========================================
-- Adds structured photo-derived feature storage to
-- facial_structure_assessments. One row per user matches the
-- assessment row shape; re-running the analysis overwrites in place.
--
-- Why on the assessment row, not a separate table:
-- * The report only ever reads the *latest* features (no history
--   needed — comparison/history lives in facial_analyses).
-- * Avoids a join in generate-report.ts; the modifier snapshot in
--   report_input_modifiers already captures what the report saw at
--   generation time.
--
-- Schema:
--   photo_features         jsonb     — structured features (8 dimensions)
--   photo_features_at      timestamptz — last successful extraction
--   photo_features_model   text      — model id that produced them
--   photo_features_refused boolean   — true if the model refused (unreadable photos, etc.)
--   photo_features_refusal_reason text — refusal explanation, when refused
--
-- The shape of photo_features (validated at the service layer, not in
-- Postgres — Postgres jsonb check constraints are awkward and the
-- truth lives in lib/facial-structure/photo-baseline/types.ts):
--   {
--     jawline_definition: 'low' | 'medium' | 'high' | 'unreadable',
--     chin_projection: 'recessed' | 'neutral' | 'projected' | 'unreadable',
--     midface_balance: 'short' | 'balanced' | 'long' | 'unreadable',
--     face_first_distribution_visual: 'face_first' | 'balanced' | 'body_first' | 'unreadable',
--     buccal_fullness: 'lean' | 'moderate' | 'full' | 'unreadable',
--     posture_head_carriage: 'neutral' | 'forward' | 'tilted' | 'unreadable',
--     facial_puff_visible: 'low' | 'moderate' | 'high' | 'unreadable',
--     asymmetry_flag: 'none' | 'mild' | 'notable' | 'unreadable',
--     angles_used: ('front' | 'close' | 'side')[],
--     notes: string | null
--   }
--
-- Run in Supabase SQL Editor.

alter table public.facial_structure_assessments
  add column if not exists photo_features jsonb,
  add column if not exists photo_features_at timestamptz,
  add column if not exists photo_features_model text,
  add column if not exists photo_features_refused boolean,
  add column if not exists photo_features_refusal_reason text;
