// Facial hair try-on service. CRUD against facial_hair_try_ons +
// signed URL minting. Inserts go through the service-role client in
// the route handler (no insert RLS — matches hair_try_ons pattern).

import type { SupabaseClient } from '@supabase/supabase-js';
import type { FacialHairStyleSlug } from '../types';
import type {
  FacialHairTryOn,
  FacialHairTryOnWithSignedUrl,
} from './types';

const BUCKET = 'progress-photos';
const SIGNED_URL_TTL_SECONDS = 60 * 60;

// Most-recent try-on per style for the user, keyed by target_style
// slug. The plan page calls this once and uses the map to render the
// try-on grid — each style cell shows its most recent generation if
// one exists, or the reference image otherwise.
export async function listMostRecentTryOnsByStyle(
  supabase: SupabaseClient,
  userId: string,
): Promise<Map<FacialHairStyleSlug, FacialHairTryOnWithSignedUrl>> {
  const { data, error } = await supabase
    .from('facial_hair_try_ons')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;

  const map = new Map<FacialHairStyleSlug, FacialHairTryOnWithSignedUrl>();
  for (const row of (data ?? []) as FacialHairTryOn[]) {
    if (map.has(row.target_style)) continue; // already have the latest
    const { data: signed } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(row.storage_path, SIGNED_URL_TTL_SECONDS);
    map.set(row.target_style, {
      ...row,
      signed_url: signed?.signedUrl ?? null,
    });
  }
  return map;
}

// Per-surface rate limit window. Facial hair has its own 3/24h budget,
// independent of hair try-ons — premium users can spend up to 6/day
// across both surfaces. Capped per-surface so a hair-experimenting
// session can't starve facial-hair experimentation and vice versa.
export async function countFacialHairTryOnsLast24h(
  supabase: SupabaseClient,
  userId: string,
): Promise<number> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count } = await supabase
    .from('facial_hair_try_ons')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', since);
  return count ?? 0;
}

export async function deleteFacialHairTryOn(
  supabase: SupabaseClient,
  userId: string,
  tryOnId: string,
): Promise<void> {
  const { data } = await supabase
    .from('facial_hair_try_ons')
    .select('storage_path')
    .eq('id', tryOnId)
    .eq('user_id', userId)
    .maybeSingle();
  if (data) {
    await supabase.storage
      .from(BUCKET)
      .remove([(data as { storage_path: string }).storage_path])
      .catch(() => {});
  }
  const { error } = await supabase
    .from('facial_hair_try_ons')
    .delete()
    .eq('id', tryOnId)
    .eq('user_id', userId);
  if (error) throw error;
}
