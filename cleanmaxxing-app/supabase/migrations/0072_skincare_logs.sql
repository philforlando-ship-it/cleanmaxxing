-- ==========================================
-- Cleanmaxxing — skincare daily SPF log
-- ==========================================
-- Daily SPF log. Skincare's equivalent of nutrition_logs / sleep
-- commitments — gives the journey a daily-relevance surface on
-- /today that the assessment + report alone don't provide.
--
-- Why SPF specifically: it is the single highest-leverage skincare
-- action and the only one that has to fire every day. Cleanser,
-- moisturizer, retinoid all matter, but only SPF has the
-- catastrophic-when-missed property (UV damage compounds and is
-- partially irreversible) that justifies a daily check. Tracking
-- the rest would be measurement theater — the user knows whether
-- they cleansed.
--
-- Same shape as nutrition_logs: one row per user per app-day,
-- single boolean as the felt-sense signal, optional notes. Date
-- is the user's app-day in their stored IANA timezone (3am-local
-- cutoff via lib/date/app-day.ts) so a late-night log routes to
-- the right day.
--
-- No streak counters, no scoring. The /today card surfaces the
-- last-7 hit count quietly the same way sleep + nutrition do.
--
-- Run in Supabase SQL Editor.

create table if not exists public.skincare_logs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  applied_spf boolean not null,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id, date)
);

create index if not exists skincare_logs_user_date_idx
  on public.skincare_logs(user_id, date desc);

alter table public.skincare_logs enable row level security;

create policy "skincare_logs_select_own"
  on public.skincare_logs for select
  using (auth.uid() = user_id);

create policy "skincare_logs_insert_own"
  on public.skincare_logs for insert
  with check (auth.uid() = user_id);

create policy "skincare_logs_update_own"
  on public.skincare_logs for update
  using (auth.uid() = user_id);

create policy "skincare_logs_delete_own"
  on public.skincare_logs for delete
  using (auth.uid() = user_id);
