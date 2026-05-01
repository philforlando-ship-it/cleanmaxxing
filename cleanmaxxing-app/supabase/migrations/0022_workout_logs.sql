-- ==========================================
-- Cleanmaxxing — Workout logs (v2 tracker, second one)
-- ==========================================
-- Per-session log: type (strength/cardio/mobility/other),
-- duration, free-text notes, plus an optional list of lifts
-- (name + sets + reps + weight) for strength sessions. Per-lift
-- detail lives in a jsonb column rather than a normalized
-- exercises table because we don't need cross-user analytics on
-- specific lifts and the schema stays flat.
--
-- Strength training is the largest single goal category for the
-- audience; until now there's been no way to log it. Mister P
-- reads recent workouts into his user-state block so training
-- answers calibrate to actual cadence ("3 sessions in last 7
-- days, mostly strength") instead of generic prescriptions.
--
-- No unique constraint on (user_id, performed_on) — multiple
-- workouts in a day are valid (lifting in the morning, run in
-- the evening). Each session is its own row.
--
-- Run in Supabase SQL Editor.

create table if not exists public.workout_logs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  performed_on date not null,
  type text not null
    check (type in ('strength', 'cardio', 'mobility', 'other')),
  duration_min int check (duration_min between 0 and 480),
  notes text,
  lifts jsonb not null default '[]'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists workout_logs_user_date_idx
  on public.workout_logs(user_id, performed_on desc);

alter table public.workout_logs enable row level security;

create policy "workout_logs_select_own"
  on public.workout_logs for select
  using (auth.uid() = user_id);

create policy "workout_logs_insert_own"
  on public.workout_logs for insert
  with check (auth.uid() = user_id);

create policy "workout_logs_update_own"
  on public.workout_logs for update
  using (auth.uid() = user_id);

create policy "workout_logs_delete_own"
  on public.workout_logs for delete
  using (auth.uid() = user_id);
