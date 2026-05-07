// Server-side helpers for facial-hair weekly upkeep tracking.
// Drives the /today upkeep tile: shows when the user is overdue for
// a groom relative to their time_commitment cadence.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { TimeCommitment } from './types';

// Days between grooms by time_commitment. The user's stated capacity
// drives the surface frequency — a 'low' user shouldn't see the tile
// every day, a 'high' user shouldn't be reminded only weekly.
const CADENCE_DAYS: Record<TimeCommitment, number> = {
  low: 7,
  medium: 4,
  high: 2,
};

export type FacialHairGroomState = {
  lastGroomedAt: string | null;
  daysSinceLastGroom: number | null;
  cadenceDays: number;
  isDue: boolean;
  // Recent grooms for context (last 8 events, newest first).
  recent: Array<{ groomed_at: string; notes: string | null }>;
};

const RECENT_LIMIT = 8;

export async function getFacialHairGroomState(
  supabase: SupabaseClient,
  userId: string,
  timeCommitment: TimeCommitment,
  now: Date = new Date(),
): Promise<FacialHairGroomState> {
  const cadenceDays = CADENCE_DAYS[timeCommitment];

  const { data, error } = await supabase
    .from('facial_hair_groom_logs')
    .select('groomed_at, notes')
    .eq('user_id', userId)
    .order('groomed_at', { ascending: false })
    .limit(RECENT_LIMIT);

  if (error) {
    return {
      lastGroomedAt: null,
      daysSinceLastGroom: null,
      cadenceDays,
      isDue: true,
      recent: [],
    };
  }

  const recent = (data ?? []).map((r) => {
    const row = r as { groomed_at: string; notes: string | null };
    return { groomed_at: row.groomed_at, notes: row.notes };
  });

  const lastGroomedAt = recent[0]?.groomed_at ?? null;
  const daysSinceLastGroom = lastGroomedAt
    ? Math.floor(
        (now.getTime() - new Date(lastGroomedAt).getTime()) /
          (24 * 60 * 60 * 1000),
      )
    : null;

  // Treat a never-logged user as "due" so the tile actually surfaces
  // once. They can ignore it; what we don't want is silence after
  // they've started the journey.
  const isDue =
    daysSinceLastGroom === null || daysSinceLastGroom >= cadenceDays;

  return {
    lastGroomedAt,
    daysSinceLastGroom,
    cadenceDays,
    isDue,
    recent,
  };
}

export async function recordFacialHairGroom(
  supabase: SupabaseClient,
  userId: string,
  notes: string | null,
): Promise<void> {
  const { error } = await supabase.from('facial_hair_groom_logs').insert({
    user_id: userId,
    notes: notes?.trim() || null,
  });
  if (error) throw error;
}
