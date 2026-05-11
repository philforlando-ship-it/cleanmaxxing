-- ==========================================
-- Cleanmaxxing — hair_assessments expanded variables
-- ==========================================
-- Adds five precision dimensions to the hair assessment beyond the
-- v0 four-question set (face_shape / density_state / hair_type_* /
-- routine). These were called out in the May 9 brain dump as
-- precision gaps in the strongest journey: the assessment didn't
-- capture variables a competent barber would weigh before naming a
-- cut.
--
--   head_shape — round / oval / oblong. DISTINCT from face shape.
--     Face shape (jaw / cheekbones / chin) drives styling at the
--     face boundary; head shape (top sit) drives how a cut sits up
--     top. A long head + round face is a different recommendation
--     than a round head + long face.
--
--   head_size — small / average / large. Affects what proportions
--     work. Phil's hypothesis: small head + tight facial structure
--     can pull off scissor-cut-no-taper styles that look wrong on
--     larger heads.
--
--   graying_level — none / scattered / peppered / salt_and_pepper /
--     mostly_gray. Affects product choice (gel for wet-look that
--     concealed gray vs matte clay that highlights it) and length
--     decisions (shorter sides often read cleaner on graying users).
--
--   ear_prominence — low / average / prominent. Drives side length
--     and taper height — prominent ears warrant more length on the
--     sides or a higher taper to balance the silhouette.
--
--   balding_pattern + balding_severity — split fields that capture
--     LOCATION (front / vertex / both / diffuse / none) and a 0-4
--     severity scalar. The existing density_state column mixes both
--     (mature_hairline / receding_hairline / crown_thinning / etc.)
--     and can't express "front recession AND vertex thinning" — the
--     classic NW pattern. Density_state is preserved as the
--     overall summary; the new fields refine it when present.
--
-- All nullable. Existing rows are unaffected — the report and stage 1
-- prompts treat null as "not screened" and fall back to the original
-- density_state-based logic. New users see the questions on the
-- assessment form.
--
-- Run in Supabase SQL Editor.

alter table public.hair_assessments
  add column if not exists head_shape text
    check (
      head_shape is null
      or head_shape in ('round', 'oval', 'oblong')
    );

alter table public.hair_assessments
  add column if not exists head_size text
    check (
      head_size is null
      or head_size in ('small', 'average', 'large')
    );

alter table public.hair_assessments
  add column if not exists graying_level text
    check (
      graying_level is null
      or graying_level in (
        'none',
        'scattered',
        'peppered',
        'salt_and_pepper',
        'mostly_gray'
      )
    );

alter table public.hair_assessments
  add column if not exists ear_prominence text
    check (
      ear_prominence is null
      or ear_prominence in ('low', 'average', 'prominent')
    );

alter table public.hair_assessments
  add column if not exists balding_pattern text
    check (
      balding_pattern is null
      or balding_pattern in (
        'none',
        'front',
        'vertex',
        'front_and_vertex',
        'diffuse'
      )
    );

alter table public.hair_assessments
  add column if not exists balding_severity smallint
    check (
      balding_severity is null
      or (balding_severity >= 0 and balding_severity <= 4)
    );
