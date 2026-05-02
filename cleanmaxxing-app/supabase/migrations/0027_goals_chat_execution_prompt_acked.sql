-- ==========================================
-- Cleanmaxxing — Per-goal Mister P execution prompt acknowledgment
-- ==========================================
-- Boolean flag tracking whether the user has explicitly acknowledged
-- the execution-mode prompt for a given goal's chat thread. The prompt
-- (a two-button choice between "Help me anyway" and "Stay with
-- foundations first") blocks the chat input on goal-scoped threads
-- after Mister P's first response, until the user makes one decision.
--
-- State machine:
--   acked=false                       → show enforcing banner, dim input
--   acked=true,  execution_mode=true  → show "mode on" banner, input live
--   acked=true,  execution_mode=false → hide banner, input live
--
-- "Help me anyway" sets execution_mode=true AND acked=true atomically.
-- "Stay with foundations first" sets acked=true only.
-- Toggling mode off later (via the "Turn off" affordance) leaves
-- acked=true so the user is not re-prompted for the same goal.
--
-- Run in Supabase SQL Editor.

alter table public.goals
  add column if not exists chat_execution_prompt_acked boolean not null default false;

-- Belt-and-suspenders backfill. The default already covers existing rows.
update public.goals set chat_execution_prompt_acked = false where chat_execution_prompt_acked is null;

-- Existing goals where the user already flipped chat_execution_mode=true
-- under the prior (non-enforcing) UI have implicitly seen the prompt.
-- Mark them acked so they don't get blocked the next time they open
-- the thread.
update public.goals set chat_execution_prompt_acked = true where chat_execution_mode = true;
