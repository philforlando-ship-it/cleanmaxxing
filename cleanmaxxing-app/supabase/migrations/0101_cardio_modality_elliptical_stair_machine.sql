-- ==========================================
-- Cleanmaxxing — cardio_assessments add 'elliptical_stair_machine'
-- ==========================================
-- Adds a 9th modality option covering both elliptical and stair
-- machines as low-impact gym cardio. The original 8-option set
-- (migration 0090) didn't have a clean home for either: elliptical
-- doesn't belong in classes_group (those are social/instructor-led)
-- and lumping into running_jogging is wrong (different mechanics +
-- impact profile).
--
-- This is especially load-bearing for the knee_pain cohort —
-- elliptical is the canonical low-impact-but-aerobic answer the
-- report-prompt already cites as a substitute (line 198), but it
-- was previously invisible to the modality picker. Now the user
-- with knee pain on file can actually select it.
--
-- Treats elliptical + stair as ONE bucket. The training stimuli
-- differ (elliptical = steady Zone 2; stair = high-RPE muscular
-- endurance) but both are low-impact gym machines and the practical
-- recommendation logic clusters them together. If splitting becomes
-- worthwhile later, that's a follow-up migration with its own
-- backfill rule (probably defaulting existing 'elliptical_stair_
-- machine' values to whichever the user is more likely to actually
-- use given their primary_role).
--
-- Run in Supabase SQL Editor.

alter table public.cardio_assessments
  drop constraint if exists cardio_assessments_modality_preference_check,
  add constraint cardio_assessments_modality_preference_check
    check (modality_preference <@ array[
      'running_jogging',
      'cycling',
      'rowing',
      'slow_walking',
      'brisk_walking_hiking',
      'elliptical_stair_machine',
      'classes_group',
      'swimming',
      'hate_all_cardio'
    ]::text[]);
