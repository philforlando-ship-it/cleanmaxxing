// Hair try-on service. CRUD against hair_try_ons + signed URL minting.
// Inserts via service-role client (no insert RLS policy on the table —
// matches the facial_analyses + hair_photo_analyses pattern).

import type { SupabaseClient } from '@supabase/supabase-js';
import type { CutFamily } from '../types';
import type { HairTryOn, HairTryOnWithSignedUrl } from './types';

const BUCKET = 'progress-photos';
const SIGNED_URL_TTL_SECONDS = 60 * 60;

// Most-recent try-on for a specific cut family. Used by the Stage 1
// card so that if the user has already generated one for their current
// recommendation, it loads instantly without re-billing.
export async function getMostRecentTryOnForCut(
  supabase: SupabaseClient,
  userId: string,
  cutFamily: CutFamily,
): Promise<HairTryOnWithSignedUrl | null> {
  const { data, error } = await supabase
    .from('hair_try_ons')
    .select('*')
    .eq('user_id', userId)
    .eq('cut_family', cutFamily)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const row = data as HairTryOn;

  const { data: signed } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(row.storage_path, SIGNED_URL_TTL_SECONDS);

  return { ...row, signed_url: signed?.signedUrl ?? null };
}

export async function countTryOnsLast24h(
  supabase: SupabaseClient,
  userId: string,
): Promise<number> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count } = await supabase
    .from('hair_try_ons')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', since);
  return count ?? 0;
}

export async function deleteTryOn(
  supabase: SupabaseClient,
  userId: string,
  tryOnId: string,
): Promise<void> {
  // Look up storage path before delete so we can clean up the file.
  const { data } = await supabase
    .from('hair_try_ons')
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
    .from('hair_try_ons')
    .delete()
    .eq('id', tryOnId)
    .eq('user_id', userId);
  if (error) throw error;
}
