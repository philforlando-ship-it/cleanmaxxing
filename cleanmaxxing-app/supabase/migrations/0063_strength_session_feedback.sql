-- ==========================================
-- Cleanmaxxing — strength_session_feedback (autoregulation morning-after check)
-- ==========================================
-- One row per workout per day captures the user's morning-after
-- recovery signal. Feeds the strength report's autoregulation rules:
--   - muscle hits soreness=3 ("still sore") on two consecutive
--     morning-afters → drop a set on it next session
--   - two consecutive sessions of pump=3 + soreness<=2 +
--     performance=up → add a set
--   - joint_pain=true recurs on the same movement → flag in
--     "What we're not doing" section
--
-- Schema choices:
--   muscle_soreness as JSONB keyed by MuscleGroup slug
--     ('chest','back','shoulders','arms','legs','glutes','core',
--     'calves'). Values 1-3 with semantics:
--       1 = fresh / not sore
--       2 = pumped-but-fine / mild lingering
--       3 = still trashed
--     JSONB chosen over 8 nullable int columns because the user
--     only marks the muscles that are actually sore — the absent
--     keys mean "fresh, didn't bother to mark."
--   workout_log_id is nullable so a feedback row can also exist
--     standalone if the user logs a fatigue check without a
--     corresponding workout (rare but valid).
--   pump_1_3 / performance_vs_last / notes are post-session
--     fields included for forward compatibility — the v0 tile is
--     morning-after only, so these stay null.
--
-- Run in Supabase SQL Editor.

create table if not exists public.strength_session_feedback (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workout_log_id uuid references public.workout_logs(id) on delete cascade,
  recorded_on date not null,
  muscle_soreness jsonb not null default '{}'::jsonb,
  joint_pain boolean,
  energy_1_5 int check (energy_1_5 between 1 and 5),
  -- Reserved for the post-session check we may layer on later. v0
  -- writes leave these null.
  pump_1_3 int check (pump_1_3 between 1 and 3),
  performance_vs_last text
    check (performance_vs_last in ('down', 'same', 'up')),
  notes text check (char_length(notes) <= 280),
  created_at timestamptz not null default now()
);

-- One feedback row per (workout, day). The card surfaces once per
-- workout the morning after; once submitted, it stops surfacing.
-- Standalone feedback rows (workout_log_id null) are not subject
-- to this constraint — the unique index ignores nulls by default.
create unique index if not exists strength_session_feedback_workout_day_unique
  on public.strength_session_feedback(workout_log_id, recorded_on)
  where workout_log_id is not null;

create index if not exists strength_session_feedback_user_date_idx
  on public.strength_session_feedback(user_id, recorded_on desc);

alter table public.strength_session_feedback enable row level security;

create policy "strength_session_feedback_select_own"
  on public.strength_session_feedback for select
  using (auth.uid() = user_id);

create policy "strength_session_feedback_insert_own"
  on public.strength_session_feedback for insert
  with check (auth.uid() = user_id);

create policy "strength_session_feedback_update_own"
  on public.strength_session_feedback for update
  using (auth.uid() = user_id);

create policy "strength_session_feedback_delete_own"
  on public.strength_session_feedback for delete
  using (auth.uid() = user_id);
