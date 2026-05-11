-- ==========================================
-- Cleanmaxxing — facial_structure_assessments.chin_jaw_concern → text[]
-- ==========================================
-- Q4 was single-select in v1 (mig 0110). UX feedback: users with
-- mixed concerns (e.g., side-profile chin projection AND front-on
-- jaw definition AND overall softness) couldn't represent that.
-- Switching to multi-select with the same 'no_specific_concern'
-- exclusivity pattern as Q3 (postural_pattern's 'none_apparent' /
-- 'unsure'): picking 'no_specific_concern' clears the others; picking
-- any specific concern clears 'no_specific_concern'. Form enforces
-- that client-side; this column just stores whatever array arrives.
--
-- Existing rows (text scalar) lift into single-element arrays. The
-- replacement check constraint validates each element is one of the
-- enumerated values and the array is non-empty.
--
-- Run in Supabase SQL Editor.

alter table public.facial_structure_assessments
  drop constraint if exists facial_structure_assessments_chin_jaw_concern_check;

alter table public.facial_structure_assessments
  alter column chin_jaw_concern set data type text[]
  using array[chin_jaw_concern];

alter table public.facial_structure_assessments
  add constraint facial_structure_assessments_chin_jaw_concern_check
  check (
    array_length(chin_jaw_concern, 1) >= 1
    and chin_jaw_concern <@ array[
      'chin_projection_side',
      'jaw_definition_front',
      'chin_neck_transition',
      'submental_fullness',
      'overall_softness',
      'no_specific_concern'
    ]::text[]
  );
