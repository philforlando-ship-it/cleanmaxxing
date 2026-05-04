-- ==========================================
-- Cleanmaxxing — webhook_debug
-- ==========================================
-- Temporary diagnostic table for the Junction webhook handler.
-- The handler appends a row for each incoming event with its
-- event_type and the key set of the body and data block. Lets us
-- diagnose ingestion issues by SELECTing recent rows directly in
-- Supabase, without needing access to Vercel runtime stdout.
--
-- Drop the table once ingestion is verified working — see the
-- corresponding "remove webhook_debug" migration.
--
-- Run in Supabase SQL Editor.

create table if not exists public.webhook_debug (
  id uuid primary key default uuid_generate_v4(),
  received_at timestamptz not null default now(),
  event_type text,
  body_keys text[],
  data_keys text[],
  branch_taken text
);

create index if not exists webhook_debug_received_idx
  on public.webhook_debug(received_at desc);
