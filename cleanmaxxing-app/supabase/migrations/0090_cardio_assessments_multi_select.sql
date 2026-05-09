-- ==========================================
-- Cleanmaxxing — cardio_assessments multi-select fields
-- ==========================================
-- Q1 (primary_role), Q3 (modality_preference), and Q6 (equipment_access)
-- become arrays. User feedback 2026-05-08: most users have multiple
-- primary roles (fat-loss support AND cardiovascular health), multiple
-- modalities they will actually run (Peloton + hiking), and multiple
-- equipment contexts (full gym + home treadmill).
--
-- Q3 also splits 'walking_hiking' into:
--   - 'slow_walking'             (under-conversational pace)
--   - 'brisk_walking_hiking'     (Zone 2 / talk-test pace)
-- Existing rows with 'walking_hiking' migrate to 'brisk_walking_hiking'
-- (the closer analog — most users selecting the lump bucket meant brisk).
--
-- Run in Supabase SQL Editor.

-- 1) Drop old single-value CHECK constraints (auto-generated names from
-- the original 'add column ... check (...)' statements). The IF EXISTS
-- guards make the migration idempotent across environments where
-- constraints may already have been recreated.
alter table public.cardio_assessments
  drop constraint if exists cardio_assessments_primary_role_check,
  drop constraint if exists cardio_assessments_modality_preference_check,
  drop constraint if exists cardio_assessments_equipment_access_check;

-- 2) Convert columns to arrays. Existing scalar values become
--    single-element arrays. NULL equipment_access (legacy rows
--    pre-migration 0070) becomes an empty array.
alter table public.cardio_assessments
  alter column primary_role type text[]
    using array[primary_role]::text[],
  alter column modality_preference type text[]
    using array[modality_preference]::text[],
  alter column equipment_access type text[]
    using case when equipment_access is null then '{}'::text[]
               else array[equipment_access]::text[] end;

-- 3) Migrate any 'walking_hiking' values (now in single-element
--    arrays) to 'brisk_walking_hiking'.
update public.cardio_assessments
   set modality_preference = array(
         select case when x = 'walking_hiking' then 'brisk_walking_hiking' else x end
         from unnest(modality_preference) as x
       )
 where 'walking_hiking' = any(modality_preference);

-- 4) Default empty arrays for future inserts; the form populates the
-- actual values on save.
alter table public.cardio_assessments
  alter column primary_role set default '{}'::text[],
  alter column modality_preference set default '{}'::text[],
  alter column equipment_access set default '{}'::text[];

-- 5) Add new array-element CHECK constraints. The <@ operator
-- ("contained by") validates that every element of the column array
-- is in the allowed set.
alter table public.cardio_assessments
  add constraint cardio_assessments_primary_role_check
    check (primary_role <@ array[
      'support_fat_loss',
      'cardiovascular_health',
      'conditioning_for_lifting',
      'general_movement',
      'not_sure'
    ]::text[]),
  add constraint cardio_assessments_modality_preference_check
    check (modality_preference <@ array[
      'running_jogging',
      'cycling',
      'rowing',
      'slow_walking',
      'brisk_walking_hiking',
      'classes_group',
      'swimming',
      'hate_all_cardio'
    ]::text[]),
  add constraint cardio_assessments_equipment_access_check
    check (equipment_access <@ array[
      'full_gym',
      'home_treadmill',
      'home_bike',
      'outdoor_only',
      'classes_studio',
      'none_minimal'
    ]::text[]);
