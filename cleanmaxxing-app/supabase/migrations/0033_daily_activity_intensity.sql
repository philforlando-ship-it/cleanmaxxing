-- ==========================================
-- Cleanmaxxing — daily_activity: active calories + intensity minutes
-- ==========================================
-- Junction's activity payload includes far more than steps. Adding
-- four columns to daily_activity so we can persist:
--
--   active_calories — calories burned from physical activity, not
--     including BMR. A far better "did I move" signal than steps
--     alone (a stairs-and-bike day reads as 200+ active calories
--     while steps barely move).
--   low_minutes / medium_minutes / high_minutes — minutes spent at
--     each intensity per day. Sum of medium + high across the last
--     7 days drives the WHO-150 weekly metric on /today.
--
-- All four are nullable. Existing rows backfill as NULL; the
-- webhook handler reads from data.calories_active, data.low,
-- data.medium, data.high going forward.
--
-- Run in Supabase SQL Editor.

alter table public.daily_activity
  add column if not exists active_calories int check (active_calories >= 0),
  add column if not exists low_minutes int check (low_minutes >= 0),
  add column if not exists medium_minutes int check (medium_minutes >= 0),
  add column if not exists high_minutes int check (high_minutes >= 0);
