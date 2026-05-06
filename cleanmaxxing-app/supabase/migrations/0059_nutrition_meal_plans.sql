-- ==========================================
-- Cleanmaxxing — nutrition_meal_plans
-- ==========================================
-- AI-generated 7-day meal plans (3 meals + snacks per day) for the
-- nutrition plan. Mirrors sleep_weekly_reviews shape — one row per
-- (user, week_start_app_day), regenerable in place.
--
-- Inputs snapshotted to inputs_snapshot jsonb so the plan reads as
-- reproducible: future displays can show the targets and food
-- preferences the LLM was working from at generation time.
--
-- Run in Supabase SQL Editor.

create table if not exists public.nutrition_meal_plans (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,

  week_start_app_day date not null,
  week_end_app_day date not null,

  -- Generated meal plan (markdown — 7 days × breakfast/lunch/dinner +
  -- snacks). Rendered via react-markdown.
  plan_text text not null,

  generated_at timestamptz not null default now(),
  model text not null,

  -- Snapshot of inputs at generation time:
  --   { calorie_target, protein_target_g, carb_target_g, fat_target_g,
  --     fasting_protocol, alcohol_use, cannabis_use,
  --     food_preferences[], food_exclusions[], food_filter_text,
  --     diet_restrictions, current_interventions[], goal_direction }
  inputs_snapshot jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (user_id, week_start_app_day)
);

create index if not exists nutrition_meal_plans_user_week_idx
  on public.nutrition_meal_plans(user_id, week_start_app_day desc);

alter table public.nutrition_meal_plans enable row level security;

create policy "nutrition_meal_plans_select_own"
  on public.nutrition_meal_plans for select
  using (auth.uid() = user_id);

create policy "nutrition_meal_plans_insert_own"
  on public.nutrition_meal_plans for insert
  with check (auth.uid() = user_id);

create policy "nutrition_meal_plans_update_own"
  on public.nutrition_meal_plans for update
  using (auth.uid() = user_id);

create policy "nutrition_meal_plans_delete_own"
  on public.nutrition_meal_plans for delete
  using (auth.uid() = user_id);
