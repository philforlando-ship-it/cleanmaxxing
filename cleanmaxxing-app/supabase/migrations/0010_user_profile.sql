-- User profile: optional self-report fields that ground Mister P's answers.
-- Lives separate from `users` because these are user-managed preferences
-- (set on /profile, captured conversationally by Mister P in a later
-- phase) rather than auth/onboarding state.
--
-- Tier 1 columns (activity_level..bf_pct_self_estimate) are read by
-- Mister P now and will be written by him conversationally in Phase 3.
-- The /profile page exposes Tier 2 columns initially; Tier 1 join the
-- profile UI once the conversational write path is wired.

create table public.user_profile (
  user_id uuid primary key references auth.users(id) on delete cascade,

  -- Tier 1: body-comp / training / lifestyle grounding
  activity_level text check (activity_level in (
    'sedentary', 'lightly_active', 'moderately_active', 'very_active'
  )),
  training_experience text check (training_experience in (
    'none', 'under_1y', '1_to_3y', '3_to_10y', 'over_10y'
  )),
  daily_training_minutes int check (daily_training_minutes between 0 and 240),
  avg_sleep_hours numeric(3,1) check (avg_sleep_hours between 0 and 14),
  diet_restrictions text,
  bf_pct_self_estimate text check (bf_pct_self_estimate in (
    'under_12', '12_to_15', '15_to_20', '20_to_25', 'over_25'
  )),

  -- Tier 2: surfaced via /profile UI
  hair_status text check (hair_status in (
    'full', 'thinning', 'receding', 'treating', 'shaved'
  )),
  -- Fitzpatrick skin types I-VI as 1..6, plus null. Stored numerically
  -- because the scale is ordinal and the labels are well known.
  skin_type smallint check (skin_type between 1 and 6),
  -- Multi-select of current interventions. Free-form within a controlled
  -- set on the API side; Postgres just enforces it's a text array.
  current_interventions text[] not null default '{}',
  budget_tier text check (budget_tier in (
    'under_50', '50_to_150', '150_to_500', 'no_limit'
  )),
  relationship_status text check (relationship_status in (
    'single', 'dating', 'partnered', 'married'
  )),

  updated_at timestamptz not null default now()
);

alter table public.user_profile enable row level security;

create policy "user_profile_select_own"
  on public.user_profile for select
  using (auth.uid() = user_id);

create policy "user_profile_insert_own"
  on public.user_profile for insert
  with check (auth.uid() = user_id);

create policy "user_profile_update_own"
  on public.user_profile for update
  using (auth.uid() = user_id);
