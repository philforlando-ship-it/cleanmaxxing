-- ==========================================
-- Cleanmaxxing — progress_photos: multi-angle support
-- ==========================================
-- Adds an `angle` column ('front' | 'close' | 'side') so each milestone
-- (baseline, 30d, 90d, 180d) can hold up to three photos: a mandatory
-- front-facing shot plus optional close-up and side-profile shots. The
-- richer angles feed the premium AI facial-analysis feature
-- (lib/facial-analysis/prompt.ts):
--   - front: facial fullness/leanness, hairline, undereye, overall skin
--   - close: skin texture and beard density at meaningful resolution
--   - side: jawline, neck definition, posture, temple recession
--
-- Migration is backwards-compatible:
-- - Existing rows backfill to angle='front' via the column default.
-- - Existing storage paths ({user_id}/{slot}.{ext}) stay intact;
--   storage_path on the row is the source of truth, so we don't
--   rename anything in Storage.
-- - New uploads (any angle) use the path scheme
--   {user_id}/{slot}-{angle}.{ext}. The upload route handles both.
--
-- Run in Supabase SQL Editor.

alter table public.progress_photos
  add column if not exists angle text not null default 'front'
    check (angle in ('front','close','side'));

-- Replace (user_id, slot) uniqueness with (user_id, slot, angle).
-- The old constraint name is the auto-generated default from the
-- inline `unique (user_id, slot)` declaration in 0008_progress_photos.sql.
alter table public.progress_photos
  drop constraint if exists progress_photos_user_id_slot_key;

alter table public.progress_photos
  add constraint progress_photos_user_id_slot_angle_key
    unique (user_id, slot, angle);
