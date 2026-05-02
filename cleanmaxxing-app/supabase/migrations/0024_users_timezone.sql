-- ==========================================
-- Cleanmaxxing — User-level IANA timezone
-- ==========================================
-- Adds a per-user timezone so /today's foreground logging surfaces
-- (Daily Check-In, sleep, workout, daily note) can roll over at
-- 3am user-local instead of midnight server-local. The 3am cutoff
-- is implemented in lib/date/app-day.ts; this migration only adds
-- the storage.
--
-- Why on `users` and not `user_profile`: day-rollover is account-
-- wide infrastructure, not a body-stat. `users` is already loaded
-- on every /today render, so no extra join.
--
-- Default 'America/New_York' covers existing rows immediately. New
-- users get the default until the silent client-side detect in
-- components/timezone-sync.tsx (mounted in (app)/layout.tsx) runs
-- on their next authenticated render and overwrites with the
-- browser-detected IANA value.
--
-- Run in Supabase SQL Editor.

alter table public.users
  add column if not exists timezone text not null default 'America/New_York';

-- Catch any pre-existing nulls if the column was ever loosened in a
-- future migration. Belt-and-suspenders; the default already covers
-- new rows.
update public.users set timezone = 'America/New_York' where timezone is null;
