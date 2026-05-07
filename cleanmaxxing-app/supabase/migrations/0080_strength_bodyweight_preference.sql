-- ==========================================
-- Cleanmaxxing — strength bodyweight-preference signal
-- ==========================================
-- Adds a tri-state preference for bodyweight exercises distinct from
-- equipment_access. Today the catalog is treated as one homogeneous
-- pool gated only by equipment-access — a full_commercial_gym user
-- with a "free weights only" preference still gets push-ups
-- recommended, and a barbell-equipped user who LIKES BW work has no
-- way to signal it.
--
-- Three states:
--   primary       — push BW exercises into recommendations even when
--                   equipment access could support free weights
--                   (calisthenics-oriented users)
--   mixed         — default; BW is in the pool, ranked equally with
--                   equipment-eligible alternatives. Backward-compat
--                   default for users who pre-date this migration.
--   fallback_only — BW only appears when no equipment-based option
--                   fits the gap (free-weight purists)
--
-- Nullable for the migration window. The form requires it on next
-- submit; the prompt + recommended-exercises modules treat null as
-- 'mixed' (existing behavior).
--
-- Run in Supabase SQL Editor.

alter table public.strength_assessments
  add column if not exists bodyweight_preference text
    check (
      bodyweight_preference is null
      or bodyweight_preference in ('primary', 'mixed', 'fallback_only')
    );
