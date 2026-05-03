-- ==========================================
-- Cleanmaxxing — progress_photos: face / body categories
-- ==========================================
-- Splits progress_photos into two categories:
--   'face' — head and face shots that feed the premium AI
--            facial-analysis feature (front, optional close, side)
--   'body' — full-body progress shots (front, optional side, back).
--            Visual comparison only; never sent to any AI.
--
-- The premium facial-analysis route filters strictly to category='face',
-- so body photos cannot leak into the AI path even if mis-tagged
-- elsewhere.
--
-- The angle column is also extended with 'back' for body photos.
-- 'close' remains valid (still meaningful for face); 'back' becomes
-- valid for body. The application enforces sensible (category, angle)
-- combinations; the schema keeps both columns flexible to avoid
-- migration churn if we later add e.g. 'three_quarter'.
--
-- Migration is backwards-compatible:
-- - Existing rows backfill to category='face' via the default.
-- - The unique key now includes category, so a user can hold
--   parallel face and body photos at the same (slot, angle).
-- - Storage paths are unchanged for existing rows. New uploads
--   prefix body paths with 'body-' to keep face paths identical
--   to the prior scheme; storage_path on the row remains
--   authoritative.

alter table public.progress_photos
  add column if not exists category text not null default 'face'
    check (category in ('face','body'));

-- Drop the inline angle check from 0028 and replace with one that
-- includes 'back'. Postgres auto-named the original constraint
-- progress_photos_angle_check.
alter table public.progress_photos
  drop constraint if exists progress_photos_angle_check;

alter table public.progress_photos
  add constraint progress_photos_angle_check
    check (angle in ('front','close','side','back'));

-- Replace (user_id, slot, angle) uniqueness with
-- (user_id, slot, angle, category).
alter table public.progress_photos
  drop constraint if exists progress_photos_user_id_slot_angle_key;

alter table public.progress_photos
  add constraint progress_photos_user_id_slot_angle_category_key
    unique (user_id, slot, angle, category);
