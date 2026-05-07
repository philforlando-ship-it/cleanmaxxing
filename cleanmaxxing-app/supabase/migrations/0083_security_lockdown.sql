-- ==========================================
-- Cleanmaxxing — pre-launch security lockdown
-- ==========================================
-- I1 audit follow-up. Two items found in the security checklist
-- pass that need migration-level fixes:
--
-- 1. webhook_debug (migration 0034) is the only public table created
--    without RLS. It holds Junction webhook diagnostics — no PII,
--    but allowing anonymous reads of ingestion patterns is
--    unnecessary information disclosure. Either drop it (it was
--    explicitly meant to be temporary) or lock it down. Drop is the
--    cleaner move; ingestion has been working since the table was
--    introduced and the diagnostic value is gone.
--
-- 2. (Future-proofing) Add the lockdown pattern as a comment so
--    new tables don't reintroduce the gap. The check is grep-able
--    pre-launch and easy to forget mid-session.
--
-- Run in Supabase SQL Editor.

drop table if exists public.webhook_debug;

-- New-table convention reminder (no-op SQL — this is documentation
-- inside the migration so it shows up in code search and PR review):
--   1. CREATE TABLE ... (defaults rls disabled in Postgres)
--   2. ALTER TABLE ... ENABLE ROW LEVEL SECURITY;
--   3. CREATE POLICY ... using (auth.uid() = user_id);
-- Skipping step 2 means the table is wide open via supabase-js with
-- the anon key — not a hypothetical, the webhook_debug case happened
-- because the diagnostic intent skipped the boilerplate.
