-- ==========================================
-- Cleanmaxxing — open up provider/source enums
-- ==========================================
-- 0031 locked health_integrations.provider, daily_activity.source,
-- and sleep_logs.source to a tight enum of apple_health / google_fit /
-- health_connect / their vital_ source variants. Apple Health turned
-- out to require a native iOS bridge that we don't have, so the
-- product is pivoting to "Connect any wearable" — Junction normalizes
-- Whoop / Oura / Fitbit / Garmin / etc. through the same path. Any
-- of those provider names need to flow into these columns now,
-- which the current check constraints would reject.
--
-- Dropping the constraints rather than expanding the allow-lists
-- because Junction adds providers regularly and constraint
-- maintenance would lag. The application enforces sensible
-- vocabularies; the DB doesn't need to.
--
-- Run in Supabase SQL Editor.

alter table public.health_integrations
  drop constraint if exists health_integrations_provider_check;

alter table public.daily_activity
  drop constraint if exists daily_activity_source_check;

alter table public.sleep_logs
  drop constraint if exists sleep_logs_source_check;
