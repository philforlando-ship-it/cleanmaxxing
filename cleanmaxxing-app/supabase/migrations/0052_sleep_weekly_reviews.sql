-- ==========================================
-- Cleanmaxxing — sleep_weekly_reviews
-- ==========================================
-- Auto-generated weekly review notes for the sleep plan. Reads
-- commitment completion rates and sleep_logs rolling avg trends over
-- a 7-day window, composes a short Mister P-voice retrospective via
-- Sonnet, persists the result so the user can read it on /plan/sleep
-- without re-billing the LLM call.
--
-- Window granularity: (week_start_app_day, week_end_app_day) — 7
-- consecutive days in the user's local timezone. The unique
-- constraint on (user_id, week_start_app_day) means re-generating
-- for the same window upserts: the user can re-roll a review for the
-- same week without piling up duplicate rows.
--
-- stats jsonb captures the inputs at generation time so reviews are
-- reproducible: future reads can show "your 7-day avg was X.X" even
-- if sleep_logs has since changed.
--
-- Run in Supabase SQL Editor.

create table if not exists public.sleep_weekly_reviews (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,

  -- 7-day window in user-local app-days. Inclusive on both ends.
  week_start_app_day date not null,
  week_end_app_day date not null,

  -- Generated retrospective (markdown). Rendered via react-markdown.
  review_text text not null,

  generated_at timestamptz not null default now(),
  model text not null,

  -- Snapshot of inputs used to generate the review:
  --   { rolling_avg_hours: number|null,
  --     prior_week_avg_hours: number|null,
  --     commitments: [{text, source_key, days_completed, days_in_window}] }
  -- Lets the UI show the numbers the LLM was reading without rerunning.
  stats jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (user_id, week_start_app_day)
);

create index if not exists sleep_weekly_reviews_user_week_idx
  on public.sleep_weekly_reviews(user_id, week_start_app_day desc);

alter table public.sleep_weekly_reviews enable row level security;

create policy "sleep_weekly_reviews_select_own"
  on public.sleep_weekly_reviews for select
  using (auth.uid() = user_id);

create policy "sleep_weekly_reviews_insert_own"
  on public.sleep_weekly_reviews for insert
  with check (auth.uid() = user_id);

create policy "sleep_weekly_reviews_update_own"
  on public.sleep_weekly_reviews for update
  using (auth.uid() = user_id);

create policy "sleep_weekly_reviews_delete_own"
  on public.sleep_weekly_reviews for delete
  using (auth.uid() = user_id);
