-- ==========================================
-- Cleanmaxxing — Mister P daily notes
-- ==========================================
-- One Mister P observation + question per user per day, surfaced
-- at the top of /today. The selector lives in
-- lib/daily-note/templates.ts (rules-based v1; LLM-generated v2
-- will replace the template_key with a model identifier and the
-- observation/question with generated text). Caching the
-- rendered text in this row rather than reselecting on every
-- /today load keeps the experience stable through the day even
-- if the user's state changes (e.g. they log sleep mid-day).
--
-- response and responded_at capture the user's free-text reply.
-- Mister P reads recent responses in his user-state block so
-- later chat answers can reflect what the user said in their
-- daily notes.
--
-- Run in Supabase SQL Editor.

create table if not exists public.daily_notes (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  -- The day this note belongs to, in user-local terms (the route
  -- writes whatever date the client computed). Unique with user_id
  -- so we cache one note per user per day.
  day date not null,
  -- Selector identifier (e.g. STUCK-DIM, T-WEEK). Lets later
  -- selector revisions skip a key the user just saw without
  -- needing to inspect the rendered text.
  template_key text not null,
  observation text not null,
  question text not null,
  response text,
  responded_at timestamptz,
  created_at timestamptz default now(),
  unique (user_id, day)
);

create index if not exists daily_notes_user_day_idx
  on public.daily_notes(user_id, day desc);

alter table public.daily_notes enable row level security;

create policy "daily_notes_select_own"
  on public.daily_notes for select
  using (auth.uid() = user_id);

create policy "daily_notes_insert_own"
  on public.daily_notes for insert
  with check (auth.uid() = user_id);

create policy "daily_notes_update_own"
  on public.daily_notes for update
  using (auth.uid() = user_id);
