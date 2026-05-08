-- ==========================================
-- Cleanmaxxing — nutrition fasting_protocol: add extended_36_biweekly
-- ==========================================
-- Adds a sixth fasting option ('one 36-hour fast every two weeks')
-- between five_two and other in the picker. Driven by a beta tester
-- who runs this protocol and didn't want to map it to 'other'.
--
-- Drops + re-adds the CHECK constraint with the expanded enum.
-- Existing rows are unaffected (all current values still validate).
-- The default stays 'none'.
--
-- Run in Supabase SQL Editor.

alter table public.nutrition_assessments
  drop constraint if exists nutrition_assessments_fasting_protocol_check;

alter table public.nutrition_assessments
  add constraint nutrition_assessments_fasting_protocol_check
  check (fasting_protocol in (
    'none',
    'time_restricted_16_8',
    'time_restricted_18_6',
    'omad',
    'five_two',
    'extended_36_biweekly',
    'other'
  ));
