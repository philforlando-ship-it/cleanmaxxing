-- ==========================================
-- Cleanmaxxing — goals.baseline_stage
-- ==========================================
-- Per the baseline-calibration spec: a goal's weekly focus card needs to
-- know where the user is starting from. Four coarse stages are enough to
-- drive placement into the on-ramp without a full intake form:
--   new         — not at all / just starting
--   light       — some experience, on and off
--   partial     — mostly consistent, want to tighten
--   established — already consistent, looking for upgrade
--
-- Each POV's on-ramp JSON maps these stages to a starting week (or to
-- the graduation state, for 'established'). Existing rows default to
-- 'new' so already-accepted goals behave identically to before the
-- migration.
--
-- Run in Supabase SQL Editor.

alter table public.goals
  add column if not exists baseline_stage text
    check (baseline_stage in ('new', 'light', 'partial', 'established'))
    default 'new';

update public.goals
  set baseline_stage = 'new'
  where baseline_stage is null;
