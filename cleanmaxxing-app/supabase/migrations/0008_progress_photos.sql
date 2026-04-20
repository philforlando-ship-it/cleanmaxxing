-- ==========================================
-- Cleanmaxxing — progress_photos
-- ==========================================
-- Baseline + 90-day selfie tracking for the photo-comparison surface.
-- Metadata lives here; actual image bytes live in a Supabase Storage
-- bucket called `progress-photos` (see STORAGE SETUP below, which has
-- to be done in the Supabase dashboard — the migrations panel can't
-- create buckets or set storage policies).
--
-- Two slots per user, max one row per slot. Re-upload replaces.
-- No AI analysis, no cross-user visibility, user-triggered deletion
-- at any time.
--
-- Run this in the Supabase SQL Editor.

create table if not exists public.progress_photos (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  slot text not null check (slot in ('baseline', 'progress_90d')),
  storage_path text not null,
  captured_at timestamptz default now(),
  unique (user_id, slot)
);

create index if not exists progress_photos_user_id_idx
  on public.progress_photos(user_id);

-- RLS: users can read, insert, update, and delete only their own rows.
alter table public.progress_photos enable row level security;

create policy "progress_photos_select_own"
  on public.progress_photos for select
  using (auth.uid() = user_id);

create policy "progress_photos_insert_own"
  on public.progress_photos for insert
  with check (auth.uid() = user_id);

create policy "progress_photos_update_own"
  on public.progress_photos for update
  using (auth.uid() = user_id);

create policy "progress_photos_delete_own"
  on public.progress_photos for delete
  using (auth.uid() = user_id);

-- ==========================================
-- STORAGE SETUP (do this in Supabase dashboard, not via migration):
-- ==========================================
-- 1. Dashboard → Storage → New bucket
--    Name: progress-photos
--    Public: OFF (keep private — access via signed URLs only)
--
-- 2. Dashboard → Storage → progress-photos → Policies → New policy
--    Create FOUR policies, each scoped to the progress-photos bucket
--    and requiring the first folder in the path to equal the user's
--    auth UID. This ensures User A cannot read, write, update, or
--    delete User B's files even with a valid signed URL attempt or
--    direct API call.
--
--    SELECT policy:
--      bucket_id = 'progress-photos'
--      AND (storage.foldername(name))[1] = auth.uid()::text
--
--    INSERT policy:
--      bucket_id = 'progress-photos'
--      AND (storage.foldername(name))[1] = auth.uid()::text
--
--    UPDATE policy:
--      bucket_id = 'progress-photos'
--      AND (storage.foldername(name))[1] = auth.uid()::text
--
--    DELETE policy:
--      bucket_id = 'progress-photos'
--      AND (storage.foldername(name))[1] = auth.uid()::text
--
-- 3. Path convention used by the upload API:
--      {user_id}/baseline.{ext}
--      {user_id}/progress-90d.{ext}
--    This matches the storage policy's folder check.
