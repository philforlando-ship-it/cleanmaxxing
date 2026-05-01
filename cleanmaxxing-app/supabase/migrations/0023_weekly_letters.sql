-- ==========================================
-- Cleanmaxxing — Mister P weekly letter
-- ==========================================
-- Sunday-morning LLM-generated letter from Mister P to the user.
-- The cron at /api/cron/weekly-letter writes one row per
-- (user_id, week_start) every Sunday; /today renders the most
-- recent letter for the rest of the week. Distinct from the
-- weekly reflection email — this surface lives inside the app
-- and reads the user's full state (sleep, workouts, reflections,
-- recent chats) rather than just check-in stats.
--
-- week_start is the Sunday that anchors the letter (the day it
-- was generated). Unique per user so a re-run of the cron
-- upserts rather than duplicates.
--
-- Run in Supabase SQL Editor.

create table if not exists public.weekly_letters (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  week_start date not null,
  body text not null,
  created_at timestamptz not null default now(),
  unique (user_id, week_start)
);

create index if not exists weekly_letters_user_week_idx
  on public.weekly_letters(user_id, week_start desc);

alter table public.weekly_letters enable row level security;

create policy "weekly_letters_select_own"
  on public.weekly_letters for select
  using (auth.uid() = user_id);
