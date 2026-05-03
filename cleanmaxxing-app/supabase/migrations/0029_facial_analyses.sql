-- ==========================================
-- Cleanmaxxing — facial_analyses
-- ==========================================
-- Premium feature: AI-generated qualitative observations comparing
-- two of a user's own progress photos. NEVER produces a numeric
-- score, ranking, or comparison to other users. Constrained to the
-- dimensions defined in lib/facial-analysis/prompt.ts.
--
-- One row per analysis run. Re-running on the same pair generates a
-- new row (history is preserved). Photo capture timestamps are
-- snapshotted so a re-uploaded photo doesn't silently invalidate
-- prior analyses — the row stays a record of what was observed
-- against the photos as they were at the time.
--
-- `angles_used` records which of front/close/side were available at
-- both timepoints and sent to the model on this run. Front is always
-- present (it's mandatory at every milestone); close and side are
-- optional and the array reflects whatever the user has captured at
-- both ends. Useful for analytics and for re-render decisions later.
--
-- Inserts happen via a service-role client in the route handler
-- (no insert policy needed; RLS bypassed). Mirrors the
-- mister_p_queries pattern: server writes, user reads.
--
-- Run in Supabase SQL Editor.

create table if not exists public.facial_analyses (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  before_slot text not null check (before_slot in ('baseline','progress_30d','progress_90d','progress_180d')),
  after_slot  text not null check (after_slot  in ('baseline','progress_30d','progress_90d','progress_180d')),
  before_captured_at timestamptz not null,
  after_captured_at  timestamptz not null,
  angles_used text[] not null,
  observations jsonb not null,
  refused boolean not null default false,
  refusal_reason text,
  model text not null,
  input_tokens int,
  output_tokens int,
  created_at timestamptz not null default now(),
  check (before_slot <> after_slot),
  check (cardinality(angles_used) >= 1)
);

create index if not exists facial_analyses_user_idx
  on public.facial_analyses(user_id, created_at desc);

alter table public.facial_analyses enable row level security;

create policy "facial_analyses_select_own"
  on public.facial_analyses for select
  using (auth.uid() = user_id);

create policy "facial_analyses_delete_own"
  on public.facial_analyses for delete
  using (auth.uid() = user_id);
