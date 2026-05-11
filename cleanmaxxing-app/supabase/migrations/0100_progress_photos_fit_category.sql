-- ==========================================
-- Cleanmaxxing — progress_photos: 'fit' category for outfit photos
-- ==========================================
-- Adds a third category alongside 'face' and 'body' for clothed
-- outfit / fit photos that the user wants Mister P to troubleshoot in
-- chat. Different semantics from face/body:
--
--   - NOT milestone-based. Each upload creates a new row; users can
--     hold many fit photos chronologically (a wardrobe log, not a
--     baseline-vs-checkpoint comparison).
--   - Slot is set to 'baseline' as a placeholder so the existing
--     NOT NULL constraint stays satisfied; the value is never used
--     for fit photos. Angle defaults to 'front' for the same reason.
--   - Storage path uses a per-upload identifier (Date.now() +
--     random suffix) instead of the slot-derived filename so multiple
--     fit photos coexist for the same user.
--
-- The unique constraint from migration 0030
-- (user_id, slot, angle, category) prevented this — it allowed only
-- one face + one body row per (slot, angle). We replace it with a
-- partial unique index that applies only to face + body, leaving fit
-- free to multiply.
--
-- Mister P chat reads fit photos via lib/mister-p/user-state.ts
-- alongside body photos. The premium facial-analysis route still
-- hard-filters to category='face' so fit photos are never sent to
-- the AI scoring path.

alter table public.progress_photos
  drop constraint if exists progress_photos_category_check;

alter table public.progress_photos
  add constraint progress_photos_category_check
    check (category in ('face', 'body', 'fit'));

-- Drop the strict (user_id, slot, angle, category) uniqueness from
-- migration 0030 and replace with a partial unique index that skips
-- 'fit' rows. Face and body still get one-row-per-slot enforcement;
-- fit gets unconstrained chronological inserts.
alter table public.progress_photos
  drop constraint if exists progress_photos_user_id_slot_angle_category_key;

create unique index if not exists
  progress_photos_user_slot_angle_category_unique
  on public.progress_photos (user_id, slot, angle, category)
  where category in ('face', 'body');

-- Index supporting the chronological fit-photos list query on
-- /photos (latest first per user).
create index if not exists progress_photos_user_fit_captured_at_idx
  on public.progress_photos (user_id, captured_at desc)
  where category = 'fit';
