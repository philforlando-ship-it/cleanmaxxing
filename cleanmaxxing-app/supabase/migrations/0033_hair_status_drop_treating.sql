-- ==========================================
-- Cleanmaxxing — drop 'treating' from hair_status
-- ==========================================
-- The /profile UI offered "On a treatment (finasteride / minoxidil /
-- similar)" as a hair_status option, but those same treatments are
-- already captured under current_interventions. Two fields encoding
-- the same fact let them disagree (e.g. hair_status='treating' with
-- no finasteride/minoxidil ticked, or hair_status='full' while
-- finasteride is selected). Hair status now describes the hair
-- itself; the treatment signal lives in current_interventions only.
--
-- Backfill policy: NULL out existing 'treating' rows rather than
-- guessing whether the user is on finasteride, minoxidil, or both.
-- The user can re-pick a hair status from /profile, and their
-- existing current_interventions are untouched. We don't have
-- enough information to safely populate interventions on their
-- behalf.
--
-- Run in Supabase SQL Editor.

update public.user_profile
   set hair_status = null
 where hair_status = 'treating';

alter table public.user_profile
  drop constraint if exists user_profile_hair_status_check;

alter table public.user_profile
  add constraint user_profile_hair_status_check
  check (hair_status in ('full', 'thinning', 'receding', 'shaved'));
