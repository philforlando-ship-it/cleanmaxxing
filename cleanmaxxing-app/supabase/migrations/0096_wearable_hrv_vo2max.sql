-- ==========================================
-- Cleanmaxxing — wearable HRV + VO2max ingestion
-- ==========================================
-- Junction is now forwarding HRV and VO2max events from Fitbit (and
-- the other providers that publish them — Garmin / Whoop / Oura /
-- Apple Watch). Two columns added so the webhook can persist what
-- the SDK returns.
--
-- HRV:
--   sleep_logs.hrv_rmssd — root mean square of successive differences
--   in milliseconds, captured during the sleep session. Delivered
--   inline on ClientFacingSleep.averageHrv, so the webhook reads it
--   from the existing sleep payload (no separate fetch). Typical
--   adult range 10-150 ms; elite athletes can exceed this. Sanity
--   check: 0 < value < 300.
--
-- VO2max:
--   daily_activity.vo2_max — mL/kg/min. Passively estimated by the
--   wearable from heart rate response to activity. Updated weekly
--   or less by most providers, so most daily_activity rows will
--   leave this NULL — that's expected. Typical adult range 25-60;
--   elite endurance athletes ~70-85. Sanity check: 0 < value < 100.
--
-- Both feed downstream:
--   - HRV → bidirectional fatigue signal (currently self-reported
--     via weekly_reflections; HRV is the passive evidence layer)
--   - VO2max → cardio report prompt for 45+ users, where the prompt
--     currently frames VO2max as an all-cause-mortality predictor
--     without an actual number to anchor on
--
-- Run in Supabase SQL Editor.

alter table public.sleep_logs
  add column if not exists hrv_rmssd int
    check (hrv_rmssd is null or (hrv_rmssd > 0 and hrv_rmssd < 300));

alter table public.daily_activity
  add column if not exists vo2_max numeric(4,1)
    check (vo2_max is null or (vo2_max > 0 and vo2_max < 100));
