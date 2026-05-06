-- ==========================================
-- Cleanmaxxing — intervention_events
-- ==========================================
-- Time-series log of things happening with each Pattern D protocol.
-- Polymorphic event_type covers the practical event shapes a user
-- needs to track on a treatment plan: side effects (with severity),
-- lab results, dose changes, check-in notes.
--
-- Why one table instead of three (side_effects + lab_results + notes):
-- the Pattern D Timeline UI shows everything that's happened with a
-- protocol interleaved by date. One table = one query for the
-- timeline + one shape for the UI. Typed columns (severity, body,
-- resolved_at) carry per-event-type fields that may be null for
-- other types — the route handler enforces sensible (event_type,
-- field) combinations on insert.
--
-- Severity is intentionally only three buckets — mild / moderate /
-- concerning. The Pattern D content explicitly tells users
-- 'concerning' = "talk to your prescriber soon, not wait and see."
-- More granular severity scales (1-10, etc.) push users into
-- self-pathologizing patterns that the framework is trying to avoid.
--
-- resolved_at is for side effects specifically — they can resolve over
-- time (initial shed phase ending, libido returning after dose adjust).
-- Lab results, dose changes, notes don't "resolve" so this column
-- stays null for those event_types.
--
-- Run in Supabase SQL Editor.

create table if not exists public.intervention_events (
  id uuid primary key default uuid_generate_v4(),
  intervention_id uuid not null references public.interventions(id) on delete cascade,
  -- Denormalized user_id for RLS simplicity. The route handler enforces
  -- that this matches the intervention's user_id on insert.
  user_id uuid not null references public.users(id) on delete cascade,

  event_type text not null check (event_type in (
    'side_effect',
    'lab_result',
    'note',
    'dose_change',
    'check_in'
  )),

  -- When the user logged this row.
  noted_at timestamptz not null default now(),
  -- When the actual event happened in the real world (lab test date,
  -- side effect onset, dose change date). Defaults to noted_at when
  -- the user doesn't backdate.
  event_at timestamptz not null default now(),

  -- Only for event_type='side_effect'. Three buckets — see header.
  severity text check (severity in ('mild', 'moderate', 'concerning')),

  -- Short label, always required.
  title text not null check (char_length(title) <= 200),

  -- Optional longer description / details.
  body text check (char_length(body) <= 2000),

  -- Side effects can resolve over time. NULL for non-side-effect events.
  resolved_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists intervention_events_intervention_idx
  on public.intervention_events(intervention_id, event_at desc);
create index if not exists intervention_events_user_idx
  on public.intervention_events(user_id);

alter table public.intervention_events enable row level security;

create policy "intervention_events_select_own"
  on public.intervention_events for select
  using (auth.uid() = user_id);

create policy "intervention_events_insert_own"
  on public.intervention_events for insert
  with check (auth.uid() = user_id);

create policy "intervention_events_update_own"
  on public.intervention_events for update
  using (auth.uid() = user_id);

create policy "intervention_events_delete_own"
  on public.intervention_events for delete
  using (auth.uid() = user_id);
