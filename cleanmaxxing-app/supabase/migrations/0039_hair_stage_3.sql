-- ==========================================
-- Cleanmaxxing — hair Stage 3 (product match)
-- ==========================================
-- Stage 3 generates a tight product recommendation: 3 picks for a user
-- with hair, or a 3-item scalp routine for a user on the bald track.
-- Single markdown text column rather than structured product objects —
-- same shape as the report. v1 simplicity; we can split into typed
-- product cards later if Stage 4 ever needs to reference specific picks.
--
-- Stage 3 follows Stage 2 (medical decision) and gates Stage 4 (daily
-- habit). The "I have what I need" acknowledgment is the gate signal —
-- the user is committing that they have the product on hand. That doesn't
-- mean they bought something new; many users already use clay or
-- pomade and just need to keep using it.
--
-- Run in Supabase SQL Editor.

alter table public.hair_assessments
  add column if not exists stage_3_recommendation_text text,
  add column if not exists stage_3_generated_at timestamptz,
  add column if not exists stage_3_model text,
  add column if not exists stage_3_acknowledged_at timestamptz;
