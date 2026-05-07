-- ==========================================
-- Cleanmaxxing — milestones (Phase D of the /today redesign)
-- ==========================================
-- Records when a user crosses a recognized milestone — either
-- behavioral ("you hit your protein floor 12 of 14 days"),
-- calendar/passive ("three months on a GLP-1 protocol"), or
-- state-driven ("you completed Stage 4 of the hair plan"). The
-- /today Area 3 surface reads the last 7 days of milestone rows
-- and renders the celebration copy in absolute / self-comparison
-- framing only — NEVER cohort comparison. See lib/milestones/copy.ts.
--
-- Voice posture (locked from the H1/H2 framing decision):
-- - No cohort comparison ("better than X% of men your age").
-- - No streak-shaming.
-- - No FOMO / "users who do X also...".
-- - No dopamine-bait copy ("Achievement unlocked", confetti).
--
-- The unique index on (user_id, trigger_key) makes
-- recordMilestoneIfNew idempotent: the picker can run this
-- detection on every /today render and the table only ever gets
-- the first occurrence per user.
--
-- For triggers that legitimately re-fire across cycles (e.g. a
-- user goes off a GLP-1, then starts a new cycle and earns the
-- three-month mark again), the trigger_key carries the
-- distinguishing id — e.g.
-- 'glp1_three_months_on_protocol:<intervention_uuid>'. Two
-- separate intervention rows produce two distinct trigger_keys
-- and the unique index lets both fire.
--
-- value_at_trigger snapshots the qualifying state at fire time
-- so the copy can include exact numbers ("12 of 14 days") even
-- if the underlying state has shifted by the time the user
-- reads it.
--
-- Run in Supabase SQL Editor.

create table if not exists public.milestones (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  trigger_key text not null,
  triggered_at timestamptz not null default now(),
  value_at_trigger jsonb,
  created_at timestamptz not null default now()
);

create unique index if not exists milestones_user_key_unique
  on public.milestones(user_id, trigger_key);

create index if not exists milestones_user_recent_idx
  on public.milestones(user_id, triggered_at desc);

alter table public.milestones enable row level security;

create policy "milestones_select_own"
  on public.milestones for select
  using (auth.uid() = user_id);

create policy "milestones_insert_own"
  on public.milestones for insert
  with check (auth.uid() = user_id);

-- No update policy — milestone rows are immutable. value_at_trigger
-- is a snapshot at fire time and shouldn't be retroactively edited.
-- No delete policy by default — historical milestone records are
-- part of the user's record. (Future: add a privacy-driven delete
-- if needed.)
