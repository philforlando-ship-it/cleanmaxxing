-- ==========================================
-- Cleanmaxxing — interventions: add 'peptide' type
-- ==========================================
-- Adds 'peptide' to the interventions.type check constraint to support
-- the GH-secretagogue Pattern D topic (/plan/peptides). Per the v1
-- scope note in lib/interventions/types.ts INTERVENTION_TYPE_LABEL,
-- this single 'peptide' type covers sermorelin / CJC-1295 / ipamorelin
-- / tesamorelin — the specific compound is captured on the
-- intervention row's free-text dose / frequency / notes fields rather
-- than via separate enum values.
--
-- The legacy user_profile.current_interventions[] column has no DB
-- check constraint (text[] with API-layer validation in
-- lib/profile/service.ts INTERVENTIONS); the TypeScript Intervention
-- type was extended in the same commit to mirror this change, so any
-- subsequent sync writes from the interventions service keep working.
--
-- Run in Supabase SQL Editor.

alter table public.interventions
  drop constraint if exists interventions_type_check;

alter table public.interventions
  add constraint interventions_type_check
  check (type in (
    'trt',
    'glp1',
    'peptide',
    'finasteride',
    'minoxidil',
    'retinoid',
    'accutane',
    'creatine',
    'ssri',
    'adhd_stimulant'
  ));
