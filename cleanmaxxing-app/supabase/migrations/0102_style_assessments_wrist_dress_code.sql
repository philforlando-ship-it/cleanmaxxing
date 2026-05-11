-- ==========================================
-- Cleanmaxxing — style_assessments: wrist_size + dress_code_context
-- ==========================================
-- Two new segmentation axes the May 2026 component-library expansion
-- needs. Per-component POV recs depend on axes that the v2 reframe
-- didn't capture:
--
--   wrist_size — drives watch dial sizing (small ~36-39mm,
--     average ~38-41mm, large ~40-43mm). Without this the report
--     defaults to mid-range and oversells "statement" watches to
--     small-wrist users.
--   dress_code_context — work-environment formality. Two users with
--     identical body + target_archetype can need very different
--     footwear / outerwear / shirt prescriptions depending on
--     whether they live in corporate, business casual, creative,
--     casual_wfh, blue_collar, or mixed contexts. The dump treated
--     this as folded into "desired look," but it's an independent
--     axis: a clean-minimalist in finance and a clean-minimalist
--     WFH need different jeans + shoes.
--
-- Both nullable so pre-migration rows stay valid; the form requires
-- them on next submit. Consumers no-op when null and fall back to
-- mid-range / unspecified-context defaults.
--
-- Run in Supabase SQL Editor.

alter table public.style_assessments
  add column if not exists wrist_size text
    check (wrist_size is null or wrist_size in (
      'small',
      'average',
      'large'
    ));

alter table public.style_assessments
  add column if not exists dress_code_context text
    check (dress_code_context is null or dress_code_context in (
      'corporate',
      'business_casual',
      'creative',
      'casual_wfh',
      'blue_collar',
      'mixed'
    ));
