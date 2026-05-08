// POST /api/plan/hair/detect-face-shape
// Returns the user's face shape classification from their baseline face
// photo. No request body — the photo is found server-side via the
// existing progress_photos schema (slot=baseline, angle=front, category=face).
//
// Response shape (success):  { face_shape, reasoning, refused: false, refusal_reason: null }
// Response shape (refusal):  { face_shape: null, reasoning, refused: true, refusal_reason }
//
// HTTP errors:
//   401 unauthorized
//   404 no_baseline_photo — user hasn't uploaded a baseline face yet
//   500 photo_fetch_failed | detection_failed

import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { detectFaceShape } from '@/lib/hair/detect-face-shape';

const PHOTO_BUCKET = 'progress-photos';

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  // Look up the baseline face photo via the authed client so RLS
  // applies — same query shape used by Mister P chat's user-state.
  const { data: photo } = await supabase
    .from('progress_photos')
    .select('storage_path')
    .eq('user_id', user.id)
    .eq('slot', 'baseline')
    .eq('angle', 'front')
    .eq('category', 'face')
    .maybeSingle();

  if (!photo) {
    return NextResponse.json(
      {
        error: 'no_baseline_photo',
        message:
          'No baseline face photo on file. Capture one at /photos first, then come back.',
      },
      { status: 404 },
    );
  }

  // Service client for the storage download — RLS on storage scopes by
  // first folder segment which is the user_id (the path was minted by
  // the auth client above). Mirrors the facial-analysis pattern.
  const service = createServiceClient();
  const { data: photoData, error: dlErr } = await service.storage
    .from(PHOTO_BUCKET)
    .download((photo as { storage_path: string }).storage_path);
  if (dlErr || !photoData) {
    return NextResponse.json(
      {
        error: 'photo_fetch_failed',
        message: dlErr?.message ?? 'unknown',
      },
      { status: 500 },
    );
  }
  const buffer = Buffer.from(await photoData.arrayBuffer());

  try {
    const result = await detectFaceShape(buffer, user.id);
    return NextResponse.json(result);
  } catch (err) {
    console.error('face_shape_detection_failed', err);
    return NextResponse.json(
      {
        error: 'detection_failed',
        message: (err as Error).message,
      },
      { status: 500 },
    );
  }
}
