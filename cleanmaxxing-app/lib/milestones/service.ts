// Milestone CRUD. Thin wrapper over the milestones table.
//
// recordMilestoneIfNew is idempotent — the unique (user_id,
// trigger_key) index in the migration handles the "fire only
// once" guarantee. The detector orchestrator can run this on
// every /today render without worrying about duplicates.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { MilestoneRow } from './types';
import { MILESTONE_SURFACE_WINDOW_DAYS } from './types';

export async function listMilestonesForUser(
  supabase: SupabaseClient,
  userId: string,
): Promise<MilestoneRow[]> {
  const { data, error } = await supabase
    .from('milestones')
    .select('*')
    .eq('user_id', userId)
    .order('triggered_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as MilestoneRow[];
}

// Recent = within the surface window (7 days). These are the
// milestones rendered in /today's Area 3 prominent fire surface.
// Older ones become quiet timeline markers / chart dots.
export async function listRecentMilestones(
  supabase: SupabaseClient,
  userId: string,
): Promise<MilestoneRow[]> {
  const since = new Date(
    Date.now() - MILESTONE_SURFACE_WINDOW_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();
  const { data, error } = await supabase
    .from('milestones')
    .select('*')
    .eq('user_id', userId)
    .gte('triggered_at', since)
    .order('triggered_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as MilestoneRow[];
}

// Idempotent insert. Returns the row when newly created, null
// when a row with this (user, trigger_key) already exists.
// Uses upsert with ignoreDuplicates so the unique index does the
// dedup work — the round trip stays one query.
export async function recordMilestoneIfNew(
  supabase: SupabaseClient,
  userId: string,
  triggerKey: string,
  valueAtTrigger: Record<string, unknown> | null,
): Promise<MilestoneRow | null> {
  const { data, error } = await supabase
    .from('milestones')
    .upsert(
      {
        user_id: userId,
        trigger_key: triggerKey,
        value_at_trigger: valueAtTrigger,
      },
      { onConflict: 'user_id,trigger_key', ignoreDuplicates: true },
    )
    .select('*')
    .maybeSingle();
  if (error) throw error;
  return (data as MilestoneRow | null) ?? null;
}
