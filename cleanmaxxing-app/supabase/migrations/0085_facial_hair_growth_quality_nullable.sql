-- ==========================================
-- Cleanmaxxing — facial_hair_assessments.growth_quality nullable
-- ==========================================
-- Migration 0074 introduced density_cheeks/chin/mustache as the v2
-- replacement for the single growth_quality slider. The Zod input
-- schema and the upsert in lib/facial-hair/service.ts both stopped
-- writing growth_quality for new assessments — but the original
-- column constraint from migration 0048 is still NOT NULL, so any
-- new save fails with: "null value in column 'growth_quality' of
-- relation 'facial_hair_assessments' violates not-null constraint".
--
-- Fix: drop the NOT NULL on growth_quality. The CHECK constraint on
-- the allowed values stays (legacy rows still need to pass it; the
-- check accepts non-null values within the original enum). Existing
-- rows are unaffected.
--
-- Run in Supabase SQL Editor.

alter table public.facial_hair_assessments
  alter column growth_quality drop not null;
