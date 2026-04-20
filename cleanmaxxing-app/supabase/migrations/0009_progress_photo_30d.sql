-- ==========================================
-- Cleanmaxxing — progress_photos: add 30-day slot
-- ==========================================
-- Adds a mid-point photo between baseline and the 90-day comparison.
-- Thirty days is before most interventions produce large visible change,
-- but it gives users a visible comparison point before the window where
-- most first-month churn happens.
--
-- Widens the slot CHECK constraint. Existing baseline / progress_90d
-- rows remain valid. The (user_id, slot) unique constraint already
-- tolerates a third slot — no change needed there.

alter table public.progress_photos
  drop constraint if exists progress_photos_slot_check;

alter table public.progress_photos
  add constraint progress_photos_slot_check
  check (slot in ('baseline', 'progress_30d', 'progress_90d'));
