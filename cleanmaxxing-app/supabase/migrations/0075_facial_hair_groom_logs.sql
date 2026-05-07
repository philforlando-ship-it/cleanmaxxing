-- ==========================================
-- Cleanmaxxing — facial-hair weekly upkeep log
-- ==========================================
-- Tracks groom/trim events. Facial-hair's daily-relevance surface on
-- /today uses this to gate a "you're due for upkeep" card based on
-- days-since-last-groom against a cadence driven by the user's
-- time_commitment from the assessment.
--
-- Cadence (time_commitment → days between grooms):
--   low    → 7 days  (one weekly cleanup)
--   medium → 4 days  (twice a week)
--   high   → 2 days  (every other day, plus a barber visit monthly)
--
-- Each row records a single groom event. Append-only (the "edit"
-- pattern for the other logs doesn't fit here — a groom event either
-- happened or didn't, you don't update it after the fact). Notes are
-- optional. id is the primary key so a user can log multiple grooms
-- per day if they actually did them.
--
-- Run in Supabase SQL Editor.

create table if not exists public.facial_hair_groom_logs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  groomed_at timestamptz not null default now(),
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists facial_hair_groom_logs_user_date_idx
  on public.facial_hair_groom_logs(user_id, groomed_at desc);

alter table public.facial_hair_groom_logs enable row level security;

create policy "facial_hair_groom_logs_select_own"
  on public.facial_hair_groom_logs for select
  using (auth.uid() = user_id);

create policy "facial_hair_groom_logs_insert_own"
  on public.facial_hair_groom_logs for insert
  with check (auth.uid() = user_id);

create policy "facial_hair_groom_logs_delete_own"
  on public.facial_hair_groom_logs for delete
  using (auth.uid() = user_id);
