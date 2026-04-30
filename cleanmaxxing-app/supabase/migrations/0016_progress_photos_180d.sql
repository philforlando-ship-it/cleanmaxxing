-- ==========================================
-- Cleanmaxxing — 180-day progress photo slot
-- ==========================================
-- Extends the progress_photos.slot CHECK to allow a fourth slot,
-- 'progress_180d', for the six-month checkpoint. Slow-moving
-- variables (hair regrowth, late aesthetic compounding, sustained
-- recomp) often don't show their full effect at 90 days — the 180d
-- photo gives the late-30s+ ICP a real reference point at six
-- months. Earlier rows remain valid; the (user_id, slot) unique
-- constraint already tolerates a fourth slot — no change needed
-- there.
--
-- Run in Supabase SQL Editor.

alter table public.progress_photos
  drop constraint if exists progress_photos_slot_check;

alter table public.progress_photos
  add constraint progress_photos_slot_check
  check (slot in ('baseline', 'progress_30d', 'progress_90d', 'progress_180d'));
