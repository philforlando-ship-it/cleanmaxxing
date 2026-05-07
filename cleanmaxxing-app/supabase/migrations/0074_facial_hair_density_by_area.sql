-- ==========================================
-- Cleanmaxxing — facial-hair density-by-area assessment
-- ==========================================
-- Adds per-area density signals to facial_hair_assessments. The v0
-- single growth_quality slider (full / mostly_full / patchy /
-- very_patchy / unsure) treated the beard as a uniform region, which
-- forces the report to recommend styles bluntly: a user with a perfect
-- mustache zone but patchy cheeks gets the same recommendation as a
-- user with patchy mustache + full cheeks, even though their style
-- options are completely different.
--
-- Three area fields, each with the same four-option scale:
--   full        — comes in dense, no visible gaps in this zone
--   sparse      — connects but thin throughout the zone
--   patchy      — visible gaps that don't fill in
--   not_present — essentially no growth in this zone
--
-- New assessments collect all three; the form treats them as required.
-- growth_quality stays in the schema (and existing rows keep it) but
-- becomes optional in the Zod input — new users won't fill it. The
-- report prompt prefers per-area data when populated, falls back to
-- growth_quality when only that is set (legacy rows pre-dating this
-- migration).
--
-- All additive, all nullable. Existing rows are unaffected.
--
-- Run in Supabase SQL Editor.

alter table public.facial_hair_assessments
  add column if not exists density_cheeks text
    check (
      density_cheeks is null
      or density_cheeks in ('full', 'sparse', 'patchy', 'not_present')
    );

alter table public.facial_hair_assessments
  add column if not exists density_chin text
    check (
      density_chin is null
      or density_chin in ('full', 'sparse', 'patchy', 'not_present')
    );

alter table public.facial_hair_assessments
  add column if not exists density_mustache text
    check (
      density_mustache is null
      or density_mustache in ('full', 'sparse', 'patchy', 'not_present')
    );
