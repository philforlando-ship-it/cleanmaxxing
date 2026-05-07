-- ==========================================
-- Cleanmaxxing — facial-hair minoxidil-for-beard milestone
-- ==========================================
-- Adds a stage milestone for off-label minoxidil-for-beard. The
-- profile-level current_interventions array carries 'minoxidil' but
-- doesn't distinguish scalp use from beard use — a user can be on
-- scalp minoxidil for hair loss without being on it for beard, and
-- vice versa.
--
-- This timestamp specifically marks "I started using minoxidil for
-- my beard" so the facial-hair report can shift framing:
--   null         → "consider minoxidil if patches are the constraint"
--   set + recent → "you're 0-3 months in, the shedding phase is normal,
--                   don't change style yet"
--   set + 3-6mo  → "still early, terminal-hair conversion is happening"
--   set + 12mo+  → "you should see meaningful change; if not, the
--                   genetic ceiling is the answer"
--
-- Surfaces a stage card on /plan/facial-hair when density-by-area
-- shows patchy/not_present zones AND goal is grow_more or
-- try_new_style AND this timestamp is null. Marking it re-runs the
-- report.
--
-- Additive, nullable. Existing rows are unaffected.
--
-- Run in Supabase SQL Editor.

alter table public.facial_hair_assessments
  add column if not exists minoxidil_for_beard_started_at timestamptz;
