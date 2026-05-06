// POST /api/plan/hair/photos/upload
// Multipart upload for one hair-photo angle. Mirrors the existing
// /api/progress-photos/upload route exactly: 25MB cap, JPEG/PNG/WebP
// allowlist, same Storage bucket ('progress-photos'), user-id-first
// path scheme so the existing storage RLS policy works unchanged.
//
// Idempotent at the (session, angle) level — re-uploading the same
// angle for the same session replaces the old file via the upsert.
//
// Body (multipart/form-data):
//   file: image (jpeg / png / webp, ≤ 25 MB)
//   angle: one of HairPhotoAngle
//   session_id: optional uuid. If omitted, we ensure-or-create the
//     user's open session.

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  ensureOpenHairSession,
  getOpenHairSession,
  upsertHairPhotoRow,
} from '@/lib/hair/photos/service';
import type { HairPhotoAngle } from '@/lib/hair/photos/types';

const ALLOWED_ANGLES: ReadonlySet<HairPhotoAngle> = new Set([
  'front',
  'hairline',
  'side_left',
  'side_right',
  'crown',
  'styled',
  'top_down',
]);
const ALLOWED_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_SIZE_BYTES = 25 * 1024 * 1024;
const BUCKET = 'progress-photos';

function extFor(mime: string): string | null {
  if (mime === 'image/jpeg') return 'jpg';
  if (mime === 'image/png') return 'png';
  if (mime === 'image/webp') return 'webp';
  return null;
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });
  }

  const file = formData.get('file');
  const angleRaw = formData.get('angle');
  const sessionIdRaw = formData.get('session_id');

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Missing file' }, { status: 400 });
  }
  if (
    typeof angleRaw !== 'string' ||
    !ALLOWED_ANGLES.has(angleRaw as HairPhotoAngle)
  ) {
    return NextResponse.json({ error: 'Invalid angle' }, { status: 400 });
  }
  const angle = angleRaw as HairPhotoAngle;
  if (!ALLOWED_MIMES.has(file.type)) {
    return NextResponse.json(
      { error: 'Only JPEG, PNG, or WebP images accepted' },
      { status: 400 },
    );
  }
  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json(
      { error: 'File too large (max 25 MB)' },
      { status: 400 },
    );
  }
  const ext = extFor(file.type);
  if (!ext) {
    return NextResponse.json({ error: 'Invalid mime type' }, { status: 400 });
  }

  // Resolve the session: explicit id (must be user's open session),
  // or fall back to ensure-or-create the user's open session.
  let sessionId: string;
  if (typeof sessionIdRaw === 'string' && sessionIdRaw) {
    const open = await getOpenHairSession(supabase, user.id);
    if (!open || open.id !== sessionIdRaw) {
      return NextResponse.json(
        { error: 'Session not open or not yours.' },
        { status: 400 },
      );
    }
    sessionId = open.id;
  } else {
    const session = await ensureOpenHairSession(supabase, user.id);
    sessionId = session.id;
  }

  // Path: {user_id}/hair/{session_id}/{angle}.{ext}
  // user-id-first segment matches the existing storage RLS policy
  // ((storage.foldername(name))[1] = auth.uid()::text).
  const path = `${user.id}/hair/${sessionId}/${angle}.${ext}`;

  // If an existing file at the same (session, angle) lives at a
  // different path (e.g. same angle re-uploaded with a different
  // extension), remove it from storage first to avoid orphans.
  const { data: existingRow } = await supabase
    .from('hair_photos')
    .select('storage_path')
    .eq('session_id', sessionId)
    .eq('angle', angle)
    .maybeSingle();
  if (
    existingRow &&
    (existingRow as { storage_path: string }).storage_path !== path
  ) {
    await supabase.storage
      .from(BUCKET)
      .remove([(existingRow as { storage_path: string }).storage_path]);
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const { error: uploadErr } = await supabase.storage
    .from(BUCKET)
    .upload(path, buffer, { contentType: file.type, upsert: true });
  if (uploadErr) {
    return NextResponse.json(
      { error: `Upload failed: ${uploadErr.message}` },
      { status: 500 },
    );
  }

  try {
    const photo = await upsertHairPhotoRow(supabase, {
      userId: user.id,
      sessionId,
      angle,
      storagePath: path,
    });
    return NextResponse.json({ ok: true, photo });
  } catch (err) {
    // DB failed; clean up the orphaned storage file.
    await supabase.storage.from(BUCKET).remove([path]);
    return NextResponse.json(
      { error: `Save failed: ${(err as Error).message}` },
      { status: 500 },
    );
  }
}
