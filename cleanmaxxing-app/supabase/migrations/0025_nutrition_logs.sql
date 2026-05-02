-- ==========================================
-- Cleanmaxxing — Nutrition logs (v2 tracker)
-- ==========================================
-- Daily protein-target log. Closes the gap between sleep_logs and
-- workout_logs: nutrition is the most-cited variable in the corpus
-- but had no daily logger. The card on /today asks a single
-- question — "did you hit your protein target?" — with an optional
-- grams field for users who actually count.
--
-- The target itself isn't stored here. Spec §2.6 + content sets
-- 0.8–0.9 g/lb as the working range; the user knows what their
-- number is. Storing a per-user target column would imply we
-- compute and serve it back, which we don't want yet — that's a
-- whole macro-tracker product. Hit/miss + optional grams covers
-- the felt-sense loop without the body-weight-obsession risk
-- larger nutrition logging carries.
--
-- date is the user's app-day in their stored IANA timezone (3am
-- cutoff via lib/date/app-day.ts) — same pattern as workout_logs.
-- Unique on (user_id, date) so editing today's entry upserts
-- rather than appends. No streaks, no scoring, no shame.
--
-- Run in Supabase SQL Editor.

create table if not exists public.nutrition_logs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  hit_target boolean not null,
  protein_grams smallint check (protein_grams is null or (protein_grams between 0 and 600)),
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id, date)
);

create index if not exists nutrition_logs_user_date_idx
  on public.nutrition_logs(user_id, date desc);

alter table public.nutrition_logs enable row level security;

create policy "nutrition_logs_select_own"
  on public.nutrition_logs for select
  using (auth.uid() = user_id);

create policy "nutrition_logs_insert_own"
  on public.nutrition_logs for insert
  with check (auth.uid() = user_id);

create policy "nutrition_logs_update_own"
  on public.nutrition_logs for update
  using (auth.uid() = user_id);

create policy "nutrition_logs_delete_own"
  on public.nutrition_logs for delete
  using (auth.uid() = user_id);
