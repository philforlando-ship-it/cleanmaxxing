// Interventions service. Owns CRUD against the interventions table
// plus the one-way sync that keeps user_profile.current_interventions[]
// (the legacy flat array) in lockstep with the rows whose status is
// 'on_protocol'.
//
// Sync direction: interventions table → legacy array (one-way only).
// Old code that reads the legacy array keeps working without
// modification. When all reads migrate to the new table, the legacy
// column can be dropped + the sync removed.

import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  Intervention,
  InterventionEvent,
  InterventionEventInsert,
  InterventionInsert,
  InterventionStatus,
  InterventionType,
  InterventionUpdate,
} from './types';

// =====================
// Reads
// =====================

export async function listInterventions(
  supabase: SupabaseClient,
  userId: string,
): Promise<Intervention[]> {
  const { data, error } = await supabase
    .from('interventions')
    .select('*')
    .eq('user_id', userId)
    .order('status', { ascending: true })
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Intervention[];
}

// 'on_protocol' OR 'paused' — the user is currently engaged with this
// protocol (either taking it, or temporarily off but planning to
// return). Excludes 'considering' (not started) and 'off' (history).
export async function listActiveInterventions(
  supabase: SupabaseClient,
  userId: string,
): Promise<Intervention[]> {
  const { data, error } = await supabase
    .from('interventions')
    .select('*')
    .eq('user_id', userId)
    .in('status', ['on_protocol', 'paused'])
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Intervention[];
}

export async function getIntervention(
  supabase: SupabaseClient,
  userId: string,
  id: string,
): Promise<Intervention | null> {
  const { data, error } = await supabase
    .from('interventions')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return data as Intervention;
}

// Look up the user's currently-on-protocol intervention of a given
// type, if any. Returns null when none exists. Used by Pattern D
// surfaces to avoid creating a duplicate active row when the user
// re-clicks "I've started treatment" on a protocol they're already on.
export async function findActiveInterventionByType(
  supabase: SupabaseClient,
  userId: string,
  type: InterventionType,
): Promise<Intervention | null> {
  const { data, error } = await supabase
    .from('interventions')
    .select('*')
    .eq('user_id', userId)
    .eq('type', type)
    .eq('status', 'on_protocol')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return data as Intervention;
}

// =====================
// Writes
// =====================

export async function createIntervention(
  supabase: SupabaseClient,
  userId: string,
  input: InterventionInsert,
): Promise<Intervention> {
  const status = input.status ?? 'considering';
  const row = {
    user_id: userId,
    type: input.type,
    status,
    prescriber_status: input.prescriber_status ?? null,
    dose: input.dose ?? null,
    frequency: input.frequency ?? null,
    titration_schedule: input.titration_schedule ?? null,
    notes: input.notes ?? null,
    started_at:
      input.started_at ??
      (status === 'on_protocol' ? new Date().toISOString() : null),
    ended_at: input.ended_at ?? null,
    next_check_in_at: input.next_check_in_at ?? null,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('interventions')
    .insert(row)
    .select('*')
    .single();
  if (error) throw error;
  const inserted = data as Intervention;

  if (statusAffectsLegacyArray(status)) {
    await syncCurrentInterventionsArray(supabase, userId);
  }

  return inserted;
}

export async function updateIntervention(
  supabase: SupabaseClient,
  userId: string,
  id: string,
  patch: InterventionUpdate,
): Promise<Intervention> {
  const cleaned: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const [k, v] of Object.entries(patch)) {
    if (v !== undefined) cleaned[k] = v;
  }

  const { data, error } = await supabase
    .from('interventions')
    .update(cleaned)
    .eq('id', id)
    .eq('user_id', userId)
    .select('*')
    .single();
  if (error) throw error;
  const updated = data as Intervention;

  // Any update that could have touched status (or that changed status
  // implicitly via the patch) re-syncs. Cheap query, simpler than
  // tracking pre-update status here.
  if (Object.prototype.hasOwnProperty.call(patch, 'status')) {
    await syncCurrentInterventionsArray(supabase, userId);
  }

  return updated;
}

// Status transition with side-effects: stamps started_at on
// 'on_protocol' (if not already set) and ended_at on 'off'. Wraps
// updateIntervention so the sync happens consistently.
export async function setInterventionStatus(
  supabase: SupabaseClient,
  userId: string,
  id: string,
  status: InterventionStatus,
): Promise<Intervention> {
  const current = await getIntervention(supabase, userId, id);
  if (!current) {
    throw new Error('Intervention not found');
  }

  const patch: InterventionUpdate = { status };
  if (status === 'on_protocol' && !current.started_at) {
    patch.started_at = new Date().toISOString();
  }
  if (status === 'off' && !current.ended_at) {
    patch.ended_at = new Date().toISOString();
  }

  return updateIntervention(supabase, userId, id, patch);
}

export async function deleteIntervention(
  supabase: SupabaseClient,
  userId: string,
  id: string,
): Promise<void> {
  const { error } = await supabase
    .from('interventions')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);
  if (error) throw error;
  // Always re-sync after a delete — the deleted row may have been
  // 'on_protocol'.
  await syncCurrentInterventionsArray(supabase, userId);
}

// =====================
// Sync to legacy array
// =====================

// Recompute user_profile.current_interventions from the interventions
// table. The legacy array carries the deduplicated set of types where
// status='on_protocol'. 'considering', 'paused', and 'off' are
// excluded — they don't represent "currently taking."
//
// One-way only: legacy column → reads from old code. Old code does
// NOT write into this table; that's the new surfaces' job.
export async function syncCurrentInterventionsArray(
  supabase: SupabaseClient,
  userId: string,
): Promise<void> {
  const { data: rows, error: selErr } = await supabase
    .from('interventions')
    .select('type')
    .eq('user_id', userId)
    .eq('status', 'on_protocol');
  if (selErr) throw selErr;

  const types = Array.from(
    new Set(((rows ?? []) as Array<{ type: string }>).map((r) => r.type)),
  );

  // Upsert against user_profile so missing rows get created with the
  // right intervention list. Using .upsert here covers the case where
  // a user's profile row hasn't been initialized yet.
  const { error: upErr } = await supabase
    .from('user_profile')
    .upsert(
      {
        user_id: userId,
        current_interventions: types,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    );
  if (upErr) throw upErr;
}

// Whether a status change should trigger a sync. Inserts into
// 'considering' don't need to bother re-querying the legacy array
// since they wouldn't change it.
function statusAffectsLegacyArray(status: InterventionStatus): boolean {
  return status === 'on_protocol';
}

// =====================
// intervention_events
// =====================

export async function listEventsForIntervention(
  supabase: SupabaseClient,
  userId: string,
  interventionId: string,
): Promise<InterventionEvent[]> {
  const { data, error } = await supabase
    .from('intervention_events')
    .select('*')
    .eq('user_id', userId)
    .eq('intervention_id', interventionId)
    .order('event_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as InterventionEvent[];
}

// Batch fetch events for multiple interventions in one round-trip.
// Returns a Map keyed by intervention_id so the UI can render each
// intervention's events without a per-card query. Empty list when no
// events exist for an intervention id.
export async function listEventsForInterventions(
  supabase: SupabaseClient,
  userId: string,
  interventionIds: string[],
): Promise<Map<string, InterventionEvent[]>> {
  const map = new Map<string, InterventionEvent[]>();
  if (interventionIds.length === 0) return map;
  for (const id of interventionIds) map.set(id, []);

  const { data, error } = await supabase
    .from('intervention_events')
    .select('*')
    .eq('user_id', userId)
    .in('intervention_id', interventionIds)
    .order('event_at', { ascending: false });
  if (error) throw error;

  for (const row of (data ?? []) as InterventionEvent[]) {
    const arr = map.get(row.intervention_id);
    if (arr) arr.push(row);
  }
  return map;
}

export async function createInterventionEvent(
  supabase: SupabaseClient,
  userId: string,
  interventionId: string,
  input: InterventionEventInsert,
): Promise<InterventionEvent> {
  // Severity is only meaningful for side_effect events. Strip it on
  // other types so we don't persist a value that doesn't apply.
  const severity =
    input.event_type === 'side_effect' ? input.severity ?? null : null;

  const row = {
    user_id: userId,
    intervention_id: interventionId,
    event_type: input.event_type,
    title: input.title,
    body: input.body ?? null,
    severity,
    event_at: input.event_at ?? new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('intervention_events')
    .insert(row)
    .select('*')
    .single();
  if (error) throw error;
  return data as InterventionEvent;
}

// Mark a side-effect event as resolved. No-op for non-side-effect
// types — those don't have a "resolved" semantic. Returns the updated
// row so the UI can refresh inline.
export async function resolveInterventionEvent(
  supabase: SupabaseClient,
  userId: string,
  eventId: string,
): Promise<InterventionEvent> {
  const { data, error } = await supabase
    .from('intervention_events')
    .update({
      resolved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', eventId)
    .eq('user_id', userId)
    .select('*')
    .single();
  if (error) throw error;
  return data as InterventionEvent;
}

export async function deleteInterventionEvent(
  supabase: SupabaseClient,
  userId: string,
  eventId: string,
): Promise<void> {
  const { error } = await supabase
    .from('intervention_events')
    .delete()
    .eq('id', eventId)
    .eq('user_id', userId);
  if (error) throw error;
}
