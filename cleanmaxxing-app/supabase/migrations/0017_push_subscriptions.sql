-- ==========================================
-- Cleanmaxxing — Web push subscriptions
-- ==========================================
-- Stores per-device web-push subscriptions for the daily check-in
-- reminder + Sunday reflection prompt. Each browser/install
-- generates a unique endpoint, so a single user with a desktop
-- install + a phone install produces two rows. Reminder hour and
-- timezone live on the subscription row (not the user) so the
-- same user can have different defaults per device — useful when
-- the desktop browser is at work and the phone is personal.
--
-- The cron at /api/cron/push-reminders iterates this table every
-- hour, computes the user's local hour for each row, and sends a
-- push when the local hour matches `reminder_hour` AND
-- `last_reminder_at` is more than 20 hours old (de-dup guard so
-- uneven cron timing doesn't double-send).
--
-- Run in Supabase SQL Editor.

create table if not exists public.push_subscriptions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  -- The web-push endpoint URL — unique per device + browser.
  endpoint text not null,
  -- The two cryptographic keys returned by PushManager.subscribe().
  -- Required by web-push to encrypt payloads.
  p256dh text not null,
  auth text not null,
  -- IANA timezone string captured from the browser at subscribe
  -- time (Intl.DateTimeFormat().resolvedOptions().timeZone). UTC
  -- fallback is intentional — better to send a slightly mistimed
  -- nudge than to drop the row entirely on browsers that don't
  -- expose the API.
  timezone text not null default 'UTC',
  -- Hour of the day (0-23, user-local) the daily reminder should
  -- fire. 20 = 8 PM default.
  reminder_hour smallint not null default 20
    check (reminder_hour between 0 and 23),
  last_reminder_at timestamptz,
  created_at timestamptz default now(),
  last_used_at timestamptz default now(),
  -- A user might re-subscribe from the same device after clearing
  -- site data; we want to upsert rather than duplicate.
  unique (user_id, endpoint)
);

create index if not exists push_subscriptions_user_idx
  on public.push_subscriptions(user_id);

alter table public.push_subscriptions enable row level security;

create policy "push_subscriptions_select_own"
  on public.push_subscriptions for select
  using (auth.uid() = user_id);

create policy "push_subscriptions_insert_own"
  on public.push_subscriptions for insert
  with check (auth.uid() = user_id);

create policy "push_subscriptions_update_own"
  on public.push_subscriptions for update
  using (auth.uid() = user_id);

create policy "push_subscriptions_delete_own"
  on public.push_subscriptions for delete
  using (auth.uid() = user_id);
