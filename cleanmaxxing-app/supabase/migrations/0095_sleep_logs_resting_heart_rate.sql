-- ==========================================
-- Cleanmaxxing — sleep_logs: add resting heart rate
-- ==========================================
-- Junction's sleep payload includes hrResting (resting BPM measured
-- during the sleep session) for every provider that supports it
-- (Fitbit / Whoop / Oura / Garmin / Apple Watch). Persisting it
-- alongside hours + quality unlocks the Tier 2 RHR trained-band
-- milestone trigger (lib/milestones/triggers.ts:210), which is
-- waiting on this column to land before it can be wired into the
-- orchestrator.
--
-- Stored on sleep_logs (not daily_activity) because RHR is captured
-- during sleep — Vital delivers it with the sleep payload, so the
-- ingestion is one column added to the existing upsert. The 14-day
-- rolling average the detector consumes doesn't care that night_of
-- is the bed-down date rather than the wake-up date.
--
-- Existing rows backfill as NULL; nothing else changes.
--
-- Run in Supabase SQL Editor.

alter table public.sleep_logs
  add column if not exists resting_heart_rate int
    check (resting_heart_rate is null or (resting_heart_rate > 0 and resting_heart_rate < 250));
