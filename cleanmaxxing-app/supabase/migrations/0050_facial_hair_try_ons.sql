-- ==========================================
-- Cleanmaxxing — facial_hair_try_ons (style preview)
-- ==========================================
-- Mirrors hair_try_ons (0044) shape: AI-generated "see yourself with
-- this style" previews against the user's baseline face photo.
-- Premium-gated, rate-limited (3 / 24h shared with hair).
--
-- Storage reuses the existing 'progress-photos' bucket. Path scheme:
--   {user_id}/facial-hair-tryons/{target_style}-{timestamp}.png
-- The user-id-first segment matches the existing storage RLS policy.
--
-- Design notes:
-- * One try-on per (user, target_style) is shown in the UI (the most
--   recent), but multiple rows allowed — re-running keeps history.
-- * The 12 target_style slugs are checked at the column level so
--   only valid styles can land in the table.
-- * No insert RLS policy — inserts go through the route handler with
--   the service-role client (matches hair_try_ons + facial_analyses).
--
-- Run in Supabase SQL Editor.

create table if not exists public.facial_hair_try_ons (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  target_style text not null check (target_style in (
    'clean_shaven',
    'light_stubble',
    'heavy_stubble',
    'chevron_mustache',
    'classic_mustache',
    'goatee_with_mustache',
    'circle_beard',
    'chinstrap_beard',
    'short_boxed_beard',
    'medium_full_beard',
    'corporate_beard',
    'ducktail_beard'
  )),
  storage_path text not null,
  model text not null,
  source_photo_path text,
  input_tokens int,
  output_tokens int,
  created_at timestamptz not null default now()
);

create index if not exists facial_hair_try_ons_user_idx
  on public.facial_hair_try_ons(user_id, created_at desc);

alter table public.facial_hair_try_ons enable row level security;

create policy "facial_hair_try_ons_select_own"
  on public.facial_hair_try_ons for select
  using (auth.uid() = user_id);

create policy "facial_hair_try_ons_delete_own"
  on public.facial_hair_try_ons for delete
  using (auth.uid() = user_id);
