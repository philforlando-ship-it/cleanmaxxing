-- ==========================================
-- Cleanmaxxing — procedural_fit_analyses
-- ==========================================
-- Premium feature: AI-generated personalized read on whether
-- cosmetic procedures (Botox, masseter, buccal fat, rhinoplasty,
-- chin / jaw, cheek filler) would meaningfully help this specific
-- user, grounded in POV 28 (cosmetic-procedures). NEVER produces a
-- numeric attractiveness score, looks-tier rating, or comparison to
-- other users — the analysis ranks procedures FOR this user, not
-- the user against anyone.
--
-- One row per analysis run. Re-running generates a new row; history
-- is preserved so a user can see how a recommendation evolved if
-- they re-ran after foundational work (lost weight, started
-- retinoid, fixed hair routine).
--
-- input_state snapshots the variables that fed the analysis at the
-- moment of the run (age, age-feel, budget tier, hair / skincare
-- baseline state) so a future re-render can show "you ran this when
-- you were 35; you're 38 now — re-run to refresh."
--
-- output stores the structured recommendation shape defined in
-- lib/procedural-fit/prompt.ts ProceduralFitOutputSchema. JSONB so
-- the shape can evolve without a schema migration.
--
-- Inserts happen via a service-role client in the route handler
-- (no insert policy needed; RLS bypassed). Mirrors the
-- facial_analyses pattern: server writes, user reads.
--
-- Run in Supabase SQL Editor.

create table if not exists public.procedural_fit_analyses (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  baseline_photo_path text not null,
  baseline_captured_at timestamptz not null,
  input_state jsonb not null,
  output jsonb not null,
  refused boolean not null default false,
  refusal_reason text,
  model text not null,
  input_tokens int,
  output_tokens int,
  created_at timestamptz not null default now()
);

create index if not exists procedural_fit_analyses_user_idx
  on public.procedural_fit_analyses(user_id, created_at desc);

alter table public.procedural_fit_analyses enable row level security;

create policy "procedural_fit_analyses_select_own"
  on public.procedural_fit_analyses for select
  using (auth.uid() = user_id);

create policy "procedural_fit_analyses_delete_own"
  on public.procedural_fit_analyses for delete
  using (auth.uid() = user_id);
