-- ==========================================
-- Cleanmaxxing — facial_structure: primary_lever_override
-- ==========================================
-- Lets the user override the computed primary lever (Slice 3 +
-- post-Slice-3 work, 2026-05-11). The compute is mechanical
-- (lib/facial-structure/primary-lever.ts), the LLM report has
-- nuance — when they disagree, the user picks which to trust and
-- Stage 2 reads the override.
--
-- Five valid values match the PrimaryLever union. NULL = no override
-- (use the computed lever). Service / API enforces the enum at
-- write time; Postgres check constraint is the second wall.
--
-- Run in Supabase SQL Editor.

alter table public.facial_structure_assessments
  add column if not exists primary_lever_override text
    check (primary_lever_override is null or primary_lever_override in (
      'body_comp',
      'puff_diagnostic',
      'posture_neck',
      'cosmetic_patternd',
      'framing'
    ));
