-- ==========================================
-- Cleanmaxxing — hair photo capture + AI analysis
-- ==========================================
-- Optional photo storage for Stage 5 (monitoring habit). Two tables
-- because hair photos are session-based: a user takes a SET of angles
-- in one sitting (front, hairline, side, crown, styled — or top-down,
-- side, front for bald track), and re-takes the same set on the next
-- cadence cycle. The body/face progress_photos schema can't model this
-- cleanly because its slots are a fixed enum (baseline / 30d / 90d /
-- 180d), not an arbitrary timeline.
--
-- Storage reuses the existing 'progress-photos' bucket. Path scheme:
--   {user_id}/hair/{session_id}/{angle}.{ext}
-- The user_id-first path keeps the existing storage RLS policy
-- (folder[1] = auth.uid()) working without modification — the policy
-- only checks the FIRST folder segment.
--
-- AI analysis is opt-in, premium-gated, mirrors facial_analyses:
-- compares two sessions, never produces a score / ranking, hard
-- refusals on prescriptive medical interpretation.
--
-- Run in Supabase SQL Editor.

create table if not exists public.hair_photo_sessions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  captured_at timestamptz not null default now(),
  -- Free-text notes the user can attach to a session ("first session
  -- after starting fin", "post-cut shot to compare against next month").
  -- Surfaced in the session card; not sent to the AI prompt.
  notes text,
  -- Set when the user marks the session complete. A session is "open"
  -- until then — they can keep adding angle photos. Once complete, it
  -- counts toward Stage 5 progress and becomes selectable for analysis.
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists hair_photo_sessions_user_id_idx
  on public.hair_photo_sessions(user_id, captured_at desc);

alter table public.hair_photo_sessions enable row level security;

create policy "hair_photo_sessions_select_own"
  on public.hair_photo_sessions for select
  using (auth.uid() = user_id);

create policy "hair_photo_sessions_insert_own"
  on public.hair_photo_sessions for insert
  with check (auth.uid() = user_id);

create policy "hair_photo_sessions_update_own"
  on public.hair_photo_sessions for update
  using (auth.uid() = user_id);

create policy "hair_photo_sessions_delete_own"
  on public.hair_photo_sessions for delete
  using (auth.uid() = user_id);

create table if not exists public.hair_photos (
  id uuid primary key default uuid_generate_v4(),
  session_id uuid not null references public.hair_photo_sessions(id) on delete cascade,
  -- Denormalized for RLS simplicity + cheap queries by user without
  -- joining through sessions. The route handler enforces consistency
  -- (the user_id on the photo always matches the session's user_id).
  user_id uuid not null references public.users(id) on delete cascade,
  angle text not null check (angle in (
    -- Hair-track angles
    'front', 'hairline', 'side_left', 'side_right', 'crown', 'styled',
    -- Bald-track angles
    'top_down'
  )),
  storage_path text not null,
  captured_at timestamptz not null default now(),
  -- One photo per (session, angle). Re-uploading the same angle
  -- replaces the prior file via the route handler's upsert pattern.
  unique (session_id, angle)
);

create index if not exists hair_photos_user_id_idx
  on public.hair_photos(user_id, captured_at desc);
create index if not exists hair_photos_session_id_idx
  on public.hair_photos(session_id);

alter table public.hair_photos enable row level security;

create policy "hair_photos_select_own"
  on public.hair_photos for select
  using (auth.uid() = user_id);

create policy "hair_photos_insert_own"
  on public.hair_photos for insert
  with check (auth.uid() = user_id);

create policy "hair_photos_update_own"
  on public.hair_photos for update
  using (auth.uid() = user_id);

create policy "hair_photos_delete_own"
  on public.hair_photos for delete
  using (auth.uid() = user_id);

create table if not exists public.hair_photo_analyses (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  before_session_id uuid not null references public.hair_photo_sessions(id) on delete cascade,
  after_session_id uuid not null references public.hair_photo_sessions(id) on delete cascade,
  before_captured_at timestamptz not null,
  after_captured_at timestamptz not null,
  angles_used text[] not null,
  observations jsonb not null,
  refused boolean not null default false,
  refusal_reason text,
  model text not null,
  input_tokens int,
  output_tokens int,
  created_at timestamptz not null default now(),
  check (before_session_id <> after_session_id),
  check (cardinality(angles_used) >= 1)
);

create index if not exists hair_photo_analyses_user_idx
  on public.hair_photo_analyses(user_id, created_at desc);

alter table public.hair_photo_analyses enable row level security;

create policy "hair_photo_analyses_select_own"
  on public.hair_photo_analyses for select
  using (auth.uid() = user_id);

create policy "hair_photo_analyses_delete_own"
  on public.hair_photo_analyses for delete
  using (auth.uid() = user_id);

-- ==========================================
-- STORAGE NOTE
-- ==========================================
-- No bucket creation needed — reuses the existing 'progress-photos'
-- bucket. The existing RLS policy `(storage.foldername(name))[1] =
-- auth.uid()::text` works as-is because hair photos use the same
-- user-id-first path scheme: {user_id}/hair/{session_id}/{angle}.{ext}
