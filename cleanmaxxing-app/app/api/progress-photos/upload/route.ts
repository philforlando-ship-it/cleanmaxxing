import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const ALLOWED_SLOTS = new Set([
  'baseline',
  'progress_30d',
  'progress_90d',
  'progress_180d',
]);
const ALLOWED_ANGLES = new Set(['front', 'close', 'side', 'back']);
const ALLOWED_CATEGORIES = new Set(['face', 'body']);
const ALLOWED_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp']);
// 25 MB. Generous on purpose — modern phone cameras produce 3-6 MB
// JPEGs but ProRAW / large WebP / multi-shot stacks can run higher,
// and downstream AI analysis (planned) benefits from preserving the
// original resolution rather than compressing aggressively at upload.
// Matches the Whisper transcribe endpoint's cap so the per-route
// payload ceiling is consistent across the app.
const MAX_SIZE_BYTES = 25 * 1024 * 1024;

const BUCKET = 'progress-photos';

function extFor(mime: string): string | null {
  if (mime === 'image/jpeg') return 'jpg';
  if (mime === 'image/png') return 'png';
  if (mime === 'image/webp') return 'webp';
  return null;
}

// Upload or replace a progress photo. Multipart/form-data body with:
//   file: image file (jpeg, png, or webp, ≤ 25 MB)
//   slot: 'baseline' | 'progress_30d' | 'progress_90d' | 'progress_180d'
//   angle: 'front' | 'close' | 'side' | 'back' (optional; defaults to 'front')
//   category: 'face' | 'body' (optional; defaults to 'face')
//
// Each (slot, angle, category) is a distinct photo: each milestone
// can hold a face front + face extras and/or a body front + body
// extras. Face photos feed the premium AI facial-analysis route;
// body photos never do — the analyze route filters strictly to
// category='face'. Re-uploading the same (slot, angle, category)
// replaces the existing one. Storage RLS on the bucket enforces
// that users can only read/write their own folder.
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
  const slotRaw = formData.get('slot');
  const angleRaw = formData.get('angle');
  const categoryRaw = formData.get('category');

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Missing file' }, { status: 400 });
  }
  if (typeof slotRaw !== 'string' || !ALLOWED_SLOTS.has(slotRaw)) {
    return NextResponse.json({ error: 'Invalid slot' }, { status: 400 });
  }
  // angle is optional; absent or empty defaults to 'front' so existing
  // single-angle clients keep working without modification.
  const angleStr = typeof angleRaw === 'string' && angleRaw ? angleRaw : 'front';
  if (!ALLOWED_ANGLES.has(angleStr)) {
    return NextResponse.json({ error: 'Invalid angle' }, { status: 400 });
  }
  const angle = angleStr;
  // category is optional; absent or empty defaults to 'face' so the
  // existing photo flow keeps working without modification.
  const categoryStr =
    typeof categoryRaw === 'string' && categoryRaw ? categoryRaw : 'face';
  if (!ALLOWED_CATEGORIES.has(categoryStr)) {
    return NextResponse.json({ error: 'Invalid category' }, { status: 400 });
  }
  const category = categoryStr;
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

  const slot = slotRaw;
  const filename =
    slot === 'baseline'
      ? 'baseline'
      : slot === 'progress_30d'
        ? 'progress-30d'
        : slot === 'progress_90d'
          ? 'progress-90d'
          : 'progress-180d';
  // Path scheme: face photos keep the prior {slot}-{angle}.{ext}
  // path so existing rows continue to read fine via storage_path.
  // Body photos prefix with body- so the two categories never
  // collide. The storage_path column on the row remains
  // authoritative for reads.
  const categoryPrefix = category === 'body' ? 'body-' : '';
  const path = `${user.id}/${categoryPrefix}${filename}-${angle}.${ext}`;

  // If an older photo exists for this exact (slot, angle, category),
  // remove it from storage first. The row upsert below handles the
  // DB side. Other (slot, angle, category) rows are not touched.
  const { data: existing } = await supabase
    .from('progress_photos')
    .select('storage_path')
    .eq('user_id', user.id)
    .eq('slot', slot)
    .eq('angle', angle)
    .eq('category', category)
    .maybeSingle();

  if (existing && existing.storage_path && existing.storage_path !== path) {
    await supabase.storage
      .from(BUCKET)
      .remove([existing.storage_path as string]);
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const { error: uploadErr } = await supabase.storage
    .from(BUCKET)
    .upload(path, buffer, {
      contentType: file.type,
      upsert: true,
    });

  if (uploadErr) {
    return NextResponse.json(
      { error: `Upload failed: ${uploadErr.message}` },
      { status: 500 },
    );
  }

  const { error: dbErr } = await supabase.from('progress_photos').upsert(
    {
      user_id: user.id,
      slot,
      angle,
      category,
      storage_path: path,
      captured_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,slot,angle,category' },
  );

  if (dbErr) {
    // Storage is ahead of DB now. Best-effort cleanup so we don't
    // leak an orphan file the user can't see or delete.
    await supabase.storage.from(BUCKET).remove([path]);
    return NextResponse.json(
      { error: `Save failed: ${dbErr.message}` },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, slot, angle, category, path });
}
