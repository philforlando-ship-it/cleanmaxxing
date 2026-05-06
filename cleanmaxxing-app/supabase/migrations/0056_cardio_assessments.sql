-- ==========================================
-- Cleanmaxxing — cardio_assessments (Pattern A eighth topic, v0)
-- ==========================================
-- Third leg of the fitness trio (nutrition + strength + cardio).
-- Mirrors the other Pattern A assessment table shape.
--
-- Voice posture (codified in lib/cardio/report-prompt.ts):
--   - Cardio is a SUPPORT tool, not the driver of fat loss. Diet is
--     the primary lever for caloric deficit; cardio supports
--     conditioning, recovery, metabolic capacity, and (after 35)
--     longevity.
--   - Zone 2 is the workhorse — underrated in mainstream fitness
--     culture. HIIT is a complement, not the foundation (1-2x/week
--     max). Step count / NEAT is genuinely load-bearing.
--   - Age-tiered: under 35 cardio is supplementary; 35-44 it
--     becomes necessary; 45+ VO2max becomes a load-bearing health-
--     span variable and Norwegian 4x4 protocol enters the menu.
--   - Modality-agnostic: the program you'll actually do beats the
--     optimal program. Talk test for intensity calibration.
--
-- Modifier sources read at report generation time:
--   user_profile.bf_pct_self_estimate
--   user_profile.daily_training_minutes
--   user_profile.activity_level
--   user_profile.training_experience (informs recovery context)
--   user_profile.current_interventions (TRT / GLP-1 / SSRI /
--     adhd_stimulant all matter for recovery + heart rate signals)
--   users.age (load-bearing — drives 35+ "cardio becomes necessary"
--     and 45+ VO2max framing)
--   nutrition_assessments.goal_direction (cross-modifier: cut →
--     cardio supports; bulk → minimal for recovery; recomp →
--     moderate Zone 2)
--   strength_assessments.days_per_week (cross-modifier: recovery
--     cost compounds with lifting volume)
--   workout_logs (last 7 days cardio session count as live signal)
--
-- Run in Supabase SQL Editor.

create table if not exists public.cardio_assessments (
  user_id uuid primary key references public.users(id) on delete cascade,

  -- Q1: primary role of cardio for the user. The framing matters
  -- because the recommendation differs sharply: 'support_fat_loss'
  -- gets the diet-is-primary reframe; 'cardiovascular_health' gets
  -- the VO2max + Zone 2 anchor; 'conditioning_for_lifting' gets a
  -- low-recovery-cost emphasis.
  primary_role text not null check (primary_role in (
    'support_fat_loss',
    'cardiovascular_health',
    'conditioning_for_lifting',
    'general_movement',
    'not_sure'
  )),

  -- Q2: honest read on current movement baseline. Drives whether
  -- the prescription leads with step count (sedentary baseline) or
  -- jumps straight to Zone 2 / HIIT structure (already moving).
  current_movement text not null check (current_movement in (
    'mostly_sedentary',
    'light_movement',
    'some_cardio',
    'regular_cardio',
    'inconsistent'
  )),

  -- Q3: modality preference. Used to pick the prescription's
  -- specific tool — running for some, cycling for others, walking
  -- for the joint-limited. POV is explicit: the program you'll
  -- actually do beats the optimal modality.
  modality_preference text not null check (modality_preference in (
    'running_jogging',
    'cycling',
    'rowing',
    'walking_hiking',
    'classes_group',
    'swimming',
    'hate_all_cardio'
  )),

  -- Q4: days per week available for STRUCTURED cardio (separate
  -- from baseline step count). 0 means rely on step count only.
  days_per_week text not null check (days_per_week in (
    '0_days',
    '1_2_days',
    '3_4_days',
    '5_plus_days'
  )),

  -- Optional one-line free text. Same convention as the other
  -- Pattern A topics.
  cardio_goal_text text check (char_length(cardio_goal_text) <= 280),

  -- Generated report (markdown).
  report_text text,
  report_generated_at timestamptz,
  report_model text,
  report_input_modifiers jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.cardio_assessments enable row level security;

create policy "cardio_assessments_select_own"
  on public.cardio_assessments for select
  using (auth.uid() = user_id);

create policy "cardio_assessments_insert_own"
  on public.cardio_assessments for insert
  with check (auth.uid() = user_id);

create policy "cardio_assessments_update_own"
  on public.cardio_assessments for update
  using (auth.uid() = user_id);
