// Latest hair anchor photo for a given user — single helper that
// folds what used to be two sequential queries (latest completed
// session, then anchor photo on that session) into one PostgREST
// embed lookup.
//
// Used by lib/mister-p/user-state.ts to populate the chat photo
// context. The /photos gallery page (HairSessionsSection) does its
// own embed query for the full per-session grid; this helper exists
// for callers that just need "give me the most recent anchor."
//
// "Anchor" angles: 'front' for the hair track, 'top_down' for the
// bald track. We pull both and prefer 'front' when present, falling
// back to 'top_down' — the same disambiguation the previous inlined
// version did.

import type { SupabaseClient } from '@supabase/supabase-js';

type SessionWithPhotos = {
  id: string;
  hair_photos: Array<{
    storage_path: string;
    angle: string;
  }>;
};

export async function getLatestHairAnchorPhotoPath(
  supabase: SupabaseClient,
  userId: string,
): Promise<string | null> {
  // PostgREST embed reads the latest completed session + its anchor-
  // angle photos in a single round trip. Filter on hair_photos.angle
  // is applied inside the embed so we don't pull side / hairline /
  // crown rows we won't use.
  const { data } = await supabase
    .from('hair_photo_sessions')
    .select('id, hair_photos!inner(storage_path, angle)')
    .eq('user_id', userId)
    .not('completed_at', 'is', null)
    .in('hair_photos.angle', ['front', 'top_down'])
    .order('captured_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return null;
  const session = data as SessionWithPhotos;
  const anchors = session.hair_photos ?? [];

  const front = anchors.find((a) => a.angle === 'front');
  const top = anchors.find((a) => a.angle === 'top_down');
  return front?.storage_path ?? top?.storage_path ?? null;
}
