-- ==========================================
-- Cleanmaxxing — strength buying-list / equipment-owned tracking
-- ==========================================
-- Adds an array of gear-item slugs the user has confirmed they own.
-- Drives the "what you'll need" buying-list panel on /plan/strength:
-- gear required by the user's selected/recommended exercises minus
-- equipment_owned = the recommended-buy list.
--
-- Distinct from equipment_access, which is a coarse 4-tier signal
-- ('full_commercial_gym' / 'home_rack_bench' / 'minimal_dumbbells' /
-- 'bodyweight_only'). equipment_owned is finer-grained — barbell +
-- plates is one item, squat rack is another, dip belt is another,
-- pull-up bar is another, etc. Slugs are validated by the service
-- layer against lib/strength/gear.ts so unknown slugs from a stale
-- client don't persist.
--
-- Stored as text[] for flexibility — the slug set will grow over
-- time as the catalog grows (new equipment categories), and a CHECK
-- constraint over a fixed value-set would force a migration each
-- time. Service-layer validation is the source of truth.
--
-- Nullable means "not yet answered." Empty array means "I confirmed
-- I have nothing." Both are valid states. The form treats null on
-- first render as "use equipment_access defaults"; once the user
-- saves, the explicit set persists.
--
-- Run in Supabase SQL Editor.

alter table public.strength_assessments
  add column if not exists equipment_owned text[] default null;
