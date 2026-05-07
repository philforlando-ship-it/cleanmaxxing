-- ==========================================
-- Cleanmaxxing — variable-cost telemetry (F2 unit economics)
-- ==========================================
-- Lightweight per-event log of variable-cost API calls (Anthropic
-- chat, OpenAI embeddings, OpenAI/Imagen image generation, etc.).
-- Drives the unit-economics conversation pre-launch and the
-- per-user cost-tracking conversation post-launch.
--
-- Designed to stay cheap: append-only insert, no per-user reads
-- (only service-role writes + admin queries). The kind column
-- carries the pricing-table key — pricing lives in code
-- (lib/cost-events/log.ts) so rate changes don't require a
-- migration.
--
-- estimated_cents is computed at log time using the rates known
-- when the call was made. If pricing changes after the fact, this
-- column is the historical truth (what we charged ourselves at the
-- time), not a live valuation. Backfill via a one-shot script if
-- you need the new pricing applied retroactively.
--
-- No PII in this table — token counts and kind labels only. The
-- prompt text + completions live in mister_p_queries and the
-- per-journey report rows.
--
-- Run in Supabase SQL Editor.

create table if not exists public.cost_events (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete set null,
  -- Pricing-table key. Examples: 'anthropic_chat',
  -- 'openai_embedding', 'openai_image_dalle3',
  -- 'imagen_3', 'anthropic_chat_streaming'. The set evolves
  -- as new APIs come online; pricing lookup happens in code.
  kind text not null,
  tokens_input integer,
  tokens_output integer,
  -- For non-token APIs (image generation, transcription) — the
  -- count of "units" of whatever the billable thing is.
  units integer,
  -- The cost as known at log time, in cents (rounded to nearest).
  -- Snapshotted because rate-table changes shouldn't rewrite
  -- history. Use 0 when pricing is unknown / TBD.
  estimated_cents integer not null default 0,
  -- Optional context: which route or feature drove the call. Useful
  -- for breakdowns ("how much do we spend per try-on generation").
  feature text,
  occurred_at timestamptz not null default now()
);

create index if not exists cost_events_user_occurred_idx
  on public.cost_events(user_id, occurred_at desc);

create index if not exists cost_events_kind_occurred_idx
  on public.cost_events(kind, occurred_at desc);

alter table public.cost_events enable row level security;

-- Service-role only writes. Users don't read or write this table
-- directly. Admin queries hit it via the service client.
-- Intentionally NO select policy — RLS denies all by default,
-- which is the correct posture here (no user-facing surface).
create policy "cost_events_service_role_insert"
  on public.cost_events for insert
  with check (false);  -- no anon/authenticated insert; service-role bypasses RLS
