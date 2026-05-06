// Service for the hair photo system. Owns reads + writes against
// hair_photo_sessions and hair_photos. Storage operations live in the
// route handlers — this file is DB-only so it can be unit-tested
// without bucket fixtures.

import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  HairPhoto,
  HairPhotoAngle,
  HairPhotoSession,
  HairPhotoSessionWithPhotos,
} from './types';

// Open session = exists for this user with completed_at IS NULL. The
// upload flow writes to the open session if one exists, otherwise
// creates a new one. Only one open session at a time per user is the
// intended invariant; the route handler re-checks before creating.
export async function getOpenHairSession(
  supabase: SupabaseClient,
  userId: string,
): Promise<HairPhotoSession | null> {
  const { data, error } = await supabase
    .from('hair_photo_sessions')
    .select('*')
    .eq('user_id', userId)
    .is('completed_at', null)
    .order('captured_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return data as HairPhotoSession;
}

export async function createHairSession(
  supabase: SupabaseClient,
  userId: string,
): Promise<HairPhotoSession> {
  const { data, error } = await supabase
    .from('hair_photo_sessions')
    .insert({ user_id: userId })
    .select('*')
    .single();
  if (error) throw error;
  return data as HairPhotoSession;
}

// Idempotent get-or-create. Returns the open session (creating one if
// none exists). Used by the upload route so a user can start uploading
// without an explicit "start session" tap.
export async function ensureOpenHairSession(
  supabase: SupabaseClient,
  userId: string,
): Promise<HairPhotoSession> {
  const open = await getOpenHairSession(supabase, userId);
  if (open) return open;
  return await createHairSession(supabase, userId);
}

// Mark a session complete. Caller is also expected to call
// service.logStage5Session afterward to bump the Stage 5 counters.
export async function completeHairSession(
  supabase: SupabaseClient,
  userId: string,
  sessionId: string,
  notes: string | null,
): Promise<void> {
  const { error } = await supabase
    .from('hair_photo_sessions')
    .update({
      completed_at: new Date().toISOString(),
      notes: notes ?? null,
    })
    .eq('id', sessionId)
    .eq('user_id', userId);
  if (error) throw error;
}

// Persist a photo row pointing at an already-uploaded storage path.
// The route handler does the actual storage upload (and replaces any
// existing file for the same (session, angle) before calling this).
export async function upsertHairPhotoRow(
  supabase: SupabaseClient,
  args: {
    userId: string;
    sessionId: string;
    angle: HairPhotoAngle;
    storagePath: string;
  },
): Promise<HairPhoto> {
  const { data, error } = await supabase
    .from('hair_photos')
    .upsert(
      {
        user_id: args.userId,
        session_id: args.sessionId,
        angle: args.angle,
        storage_path: args.storagePath,
        captured_at: new Date().toISOString(),
      },
      { onConflict: 'session_id,angle' },
    )
    .select('*')
    .single();
  if (error) throw error;
  return data as HairPhoto;
}

export async function listHairSessionsWithPhotos(
  supabase: SupabaseClient,
  userId: string,
): Promise<HairPhotoSessionWithPhotos[]> {
  const { data: sessions, error: sessionsErr } = await supabase
    .from('hair_photo_sessions')
    .select('*')
    .eq('user_id', userId)
    .order('captured_at', { ascending: false });
  if (sessionsErr) throw sessionsErr;

  const sessionRows = (sessions ?? []) as HairPhotoSession[];
  if (sessionRows.length === 0) return [];

  const sessionIds = sessionRows.map((s) => s.id);
  const { data: photos, error: photosErr } = await supabase
    .from('hair_photos')
    .select('*')
    .eq('user_id', userId)
    .in('session_id', sessionIds);
  if (photosErr) throw photosErr;

  const photosBySession = new Map<string, HairPhoto[]>();
  for (const p of (photos ?? []) as HairPhoto[]) {
    const arr = photosBySession.get(p.session_id) ?? [];
    arr.push(p);
    photosBySession.set(p.session_id, arr);
  }

  return sessionRows.map((s) => ({
    ...s,
    photos: photosBySession.get(s.id) ?? [],
  }));
}

export async function getHairPhotoById(
  supabase: SupabaseClient,
  userId: string,
  photoId: string,
): Promise<HairPhoto | null> {
  const { data, error } = await supabase
    .from('hair_photos')
    .select('*')
    .eq('id', photoId)
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return data as HairPhoto;
}

export async function deleteHairPhotoRow(
  supabase: SupabaseClient,
  userId: string,
  photoId: string,
): Promise<void> {
  const { error } = await supabase
    .from('hair_photos')
    .delete()
    .eq('id', photoId)
    .eq('user_id', userId);
  if (error) throw error;
}
