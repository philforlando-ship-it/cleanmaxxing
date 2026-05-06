-- ==========================================
-- Cleanmaxxing — hair_try_ons (Stage 1 cut preview)
-- ==========================================
-- AI-generated "see yourself with this cut" previews. Premium-gated,
-- rate-limited (3 / 24h). Stores the cut_family at generation time so
-- if the user re-runs Stage 1 and gets a new recommendation, prior
-- previews stay valid as historical artifacts.
--
-- Storage reuses the existing 'progress-photos' bucket. Path scheme:
--   {user_id}/hair-tryons/{cut_family}-{timestamp}.png
-- The user-id-first segment matches the existing storage RLS policy.
--
-- v1 design notes:
-- * Multiple try-ons per user are allowed (different cuts, retries).
--   No unique constraint on (user_id, cut_family) — re-running keeps
--   history. The Stage 1 card surfaces only the most-recent for the
--   current recommended cut.
-- * No `refused` column — we don't expect refusal patterns the way
--   facial-analysis does. The image is either generated or the call
--   fails (and no row gets written).
--
-- Run in Supabase SQL Editor.

create table if not exists public.hair_try_ons (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  -- Snapshot of the cut at generation time. Not a foreign key —
  -- cut_family is an enum on the type level, not a real table.
  cut_family text not null check (cut_family in (
    'textured_crop',
    'ivy_league',
    'textured_quiff',
    'mid_length_textured',
    'crew_cut',
    'buzz_cut',
    'slick_back',
    'curtains',
    'bald_track'
  )),
  storage_path text not null,
  model text not null,
  -- Optional source photo path snapshot — useful for debugging "why
  -- does this preview not look like me" (the user may have replaced
  -- their baseline photo since the try-on was generated).
  source_photo_path text,
  input_tokens int,
  output_tokens int,
  created_at timestamptz not null default now()
);

create index if not exists hair_try_ons_user_idx
  on public.hair_try_ons(user_id, created_at desc);

alter table public.hair_try_ons enable row level security;

create policy "hair_try_ons_select_own"
  on public.hair_try_ons for select
  using (auth.uid() = user_id);

create policy "hair_try_ons_delete_own"
  on public.hair_try_ons for delete
  using (auth.uid() = user_id);

-- No insert policy — inserts happen via service-role client in the
-- route handler (mirrors facial_analyses + hair_photo_analyses).
