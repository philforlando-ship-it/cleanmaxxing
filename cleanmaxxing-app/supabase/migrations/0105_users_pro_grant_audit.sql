-- ==========================================
-- Cleanmaxxing — users Pro-grant audit fields
-- ==========================================
-- Admin grants of Pro access (subscription_status='active' without a
-- paying Stripe subscription) need an audit trail so:
--   - "comped" users can be distinguished from paying subscribers
--   - revenue/churn reports can exclude grants
--   - an admin can see who granted what, when, and why
--
-- Five columns on public.users capture the most-recent grant/revoke
-- pair. Full grant history (multiple grants over time) is out of scope
-- for v1; if needed later, fold these into a subscription_grants
-- table. Currently-granted = subscription_status='active' AND
-- pro_granted_at IS NOT NULL AND pro_revoked_at IS NULL.
--
-- The CLI grant script (scripts/grant-premium.ts) and the admin UI
-- (/admin/access) both write these fields. The CLI uses the sentinel
-- email 'cli' for granted_by_email since it runs with the service key
-- and has no admin user context.
--
-- Run in Supabase SQL Editor.

alter table public.users
  add column if not exists pro_granted_at timestamptz,
  add column if not exists pro_granted_by_email text,
  add column if not exists pro_grant_reason text,
  add column if not exists pro_revoked_at timestamptz,
  add column if not exists pro_revoked_by_email text;

-- Partial index for the "recent grants" listing on /admin/access.
-- Only granted rows are interesting; bare users.id lookups are fine
-- without this.
create index if not exists users_pro_granted_at_idx
  on public.users(pro_granted_at desc)
  where pro_granted_at is not null;
