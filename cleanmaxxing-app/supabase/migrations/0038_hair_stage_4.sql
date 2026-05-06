-- ==========================================
-- Cleanmaxxing — hair Stage 4 (daily styling routine)
-- ==========================================
-- Stage 4 is the first hair stage that actually paces the user across
-- weeks. The check-in tile lives on /today; each tap inserts a row in
-- hair_daily_routine_logs for the user's app-day. Stage 4 completes when
-- the row count hits stage_4_target_check_ins.
--
-- Two design choices worth noting:
--
-- 1. New table for the daily logs (vs. a counter column on
--    hair_assessments). A row per check-in lets us answer "did the user
--    log today" without storing the date separately, supports honest
--    history (the user can see they logged 9 of the last 14 days, not
--    just "9 ticks"), and mirrors sleep_logs' shape so any later
--    consistency analytics work the same way.
--
-- 2. Modifier-aware target stored on the assessment row (not derived).
--    The default is 14, but users on SSRI / ADHD stimulant get 7 — that
--    eased gate is a Chris-feedback / mental-health-modifier concession
--    (see project_journey_redesign_framework.md). Storing the target at
--    Stage 4 start time means later changes to the user's interventions
--    don't mid-flight retarget the gate the user is working toward.
--
-- Run in Supabase SQL Editor.

create table if not exists public.hair_daily_routine_logs (
  user_id uuid not null references public.users(id) on delete cascade,
  on_date date not null,
  logged_at timestamptz not null default now(),
  primary key (user_id, on_date)
);

create index if not exists hair_daily_routine_logs_user_date_idx
  on public.hair_daily_routine_logs(user_id, on_date desc);

alter table public.hair_daily_routine_logs enable row level security;

create policy "hair_daily_routine_logs_select_own"
  on public.hair_daily_routine_logs for select
  using (auth.uid() = user_id);

create policy "hair_daily_routine_logs_insert_own"
  on public.hair_daily_routine_logs for insert
  with check (auth.uid() = user_id);

create policy "hair_daily_routine_logs_delete_own"
  on public.hair_daily_routine_logs for delete
  using (auth.uid() = user_id);

alter table public.hair_assessments
  add column if not exists stage_4_started_at timestamptz,
  add column if not exists stage_4_target_check_ins int
    check (stage_4_target_check_ins between 1 and 60),
  add column if not exists stage_4_completed_at timestamptz;
