-- ==========================================
-- Cleanmaxxing — Motivation segment
-- ==========================================
-- Per spec §1 / §2 Feature 1 / §7 (amendment from 2026-04-15):
-- Capture the user's motivation for coming to Cleanmaxxing and route
-- the experience by segment (ambient, never labeled back to the user).
--
-- Run in Supabase SQL Editor (the Migrations panel chokes on ad-hoc DDL).

alter table public.users
  add column if not exists motivation_segment text
    check (motivation_segment in (
      'feel-better-in-own-skin',
      'social-professional-confidence',
      'specific-event',
      'structured-plan',
      'something-specific-bothering-me',
      'not-sure-yet'
    ));

alter table public.users
  add column if not exists motivation_specific_detail text;
