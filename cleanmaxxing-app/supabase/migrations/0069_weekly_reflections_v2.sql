-- ==========================================
-- Cleanmaxxing — weekly_reflections v2 (Phase F of /today redesign)
-- ==========================================
-- Structural reframe of the weekly reflection from "rate your
-- confidence on 4 dimensions" to "report what happened":
--   1. Process adherence per active journey (qualitative tier)
--   2. Outcome observations (external evidence)
--   3. Directional flag (kept from v1 spirit; replaces stuck-confidence)
--   4. Free-text reflection (kept; rotating prompts)
--
-- Voice posture: the v1 confidence sliders trained self-rating /
-- self-surveillance, which was the one place the app's posture
-- diverged from "no rating, no tier-list, no high-value-man." v2
-- moves to external observation. Aligns with the rest of the app.
--
-- Migration strategy: COHABIT + FREEZE. The v1 columns
-- (social_confidence, work_confidence, physical_confidence,
-- appearance_confidence) stay in the table — historical data is
-- preserved — but new submissions never write to them. Reads can
-- still surface legacy weeks via a future "Legacy confidence
-- history" expander on /reflection (not built in this migration).
--
-- Schema changes here are purely additive — no DROP COLUMN, no
-- ALTER on existing column types. Old rows continue to read
-- correctly through the cohabit period.
--
-- Run in Supabase SQL Editor.

alter table public.weekly_reflections
  -- Process adherence per journey, keyed by journey topic. Shape:
  --   { "hair": "most_days", "nutrition": "some_days", "strength": "few_or_none", "glp1": "most_days" }
  -- Only journeys the user actively engages with at reflection time
  -- get a key. Absent keys mean "the user does not have this
  -- journey active" (NOT "they failed to answer").
  add column if not exists process_adherence jsonb,

  -- Outcome observations — three fixed weekly questions.
  add column if not exists outcome_appearance_comment boolean,
  add column if not exists outcome_appearance_comment_text text
    check (outcome_appearance_comment_text is null or char_length(outcome_appearance_comment_text) <= 280),
  add column if not exists outcome_initiated text
    check (outcome_initiated is null or outcome_initiated in ('yes', 'no', 'not_applicable')),
  add column if not exists outcome_physical_feel text
    check (outcome_physical_feel is null or outcome_physical_feel in ('better', 'same', 'worse', 'mixed')),

  -- Directional flag. Same posture the legacy stuck-confidence
  -- signal tried to capture, but as the user's own self-report
  -- rather than a derived computation. Retiring stuck-confidence
  -- entirely in favor of this.
  add column if not exists directional_flag text
    check (directional_flag is null or directional_flag in (
      'more_on_track', 'about_the_same', 'less_on_track', 'losing_momentum'
    )),

  -- Which rotating free-text prompt was shown for `notes`. Stored
  -- so the chart can group answers by prompt type if useful.
  add column if not exists prompt_used text
    check (prompt_used is null or prompt_used in (
      'something_worth_noting', 'something_surprising', 'tried_what_worked'
    ));

-- The existing `notes text` column carries the free-text answer.
-- No schema change needed; the prompt_used column tells us which
-- question the notes correspond to.

-- The legacy v1 confidence columns stay nullable for both old and
-- new rows. Old rows have them populated; new rows leave them null.
-- A future migration can drop them once the legacy chart-history
-- expander is built (or once we decide to abandon v1 history).
