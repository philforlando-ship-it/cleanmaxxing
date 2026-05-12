-- ==========================================
-- Cleanmaxxing — MyFitnessPal integrations (credential storage)
-- ==========================================
-- First credential-storing integration. Junction (Vital) handles
-- OAuth for wearables, so health_integrations only stores a stable
-- provider user id. MyFitnessPal has no public OAuth, so we either
-- store credentials ourselves (this) or wait for an aggregator that
-- can afford to license the official API (Terra, $499+/mo). The
-- credential path is the MVP bridge: scrape via python-myfitnesspal
-- (Slice 2 adds the sync function), Pro-gated, easy to rip out once
-- Terra or the official API becomes viable.
--
-- Schema decisions:
--   - One row per user (unique on user_id). MFP doesn't support
--     multiple accounts in one client.
--   - mfp_username plain text — typically an email; user needs to
--     see it on the settings card ("Connected as foo@bar.com").
--   - encrypted_password is the only secret. Format is whatever the
--     lib/mfp/credentials.ts helper writes (AES-256-GCM, base64
--     iv:tag:ciphertext); the DB never inspects it.
--   - status defaults to 'active'; flipped to 'auth_failed' by the
--     sync job when login starts returning 401/403 so the settings
--     card can prompt for new credentials without zeroing the row.
--   - last_error + last_error_at let the card surface a stale-sync
--     warning. last_synced_at = the most recent successful pull;
--     stays null until Slice 2 ships.
--
-- Encryption key: MFP_ENCRYPTION_KEY (32 random bytes, base64-
-- encoded in the env var). The lib/mfp/credentials.ts module refuses
-- to start without it. Rotation is a manual re-encrypt pass — out of
-- scope for slice 1, but the format includes the IV so an algorithm
-- swap stays clean.
--
-- Run in Supabase SQL Editor.

create table if not exists public.mfp_integrations (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null unique references public.users(id) on delete cascade,
  mfp_username text not null,
  encrypted_password text not null,
  status text not null default 'active'
    check (status in ('active','auth_failed','disabled')),
  connected_at timestamptz not null default now(),
  last_synced_at timestamptz,
  last_error text,
  last_error_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists mfp_integrations_user_idx
  on public.mfp_integrations(user_id);

alter table public.mfp_integrations enable row level security;

-- Users can see their own row (status + last_synced_at drive UI).
-- Encrypted password is selectable but useless without the server
-- key, so no need to hide it from the client.
create policy "mfp_integrations_select_own"
  on public.mfp_integrations for select
  using (auth.uid() = user_id);

create policy "mfp_integrations_delete_own"
  on public.mfp_integrations for delete
  using (auth.uid() = user_id);

-- Inserts and updates flow through service-role clients in the
-- connect / sync routes. Credential writes never go through the
-- anon-key path — the server is the only thing that holds the
-- encryption key, so the user's session is irrelevant for ciphertext
-- production.
