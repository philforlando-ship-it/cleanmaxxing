import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const ALLOWED_SLOTS = new Set([
  'baseline',
  'progress_30d',
  'progress_90d',
  'progress_180d',
]);
const ALLOWED_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_SIZE_BYTES = 8 * 1024 * 1024; // 8 MB — modern phone cameras produce 3-6MB JPEGs

const BUCKET = 'progress-photos';

function extFor(mime: string): string | null {
  if (mime === 'image/jpeg') return 'jpg';
  if (mime === 'image/png') return 'png';
  if (mime === 'image/webp') return 'webp';
  return null;
}

// Upload or replace a progress photo. Multipart/form-data body with:
//   file: image file (jpeg, png, or webp, ≤ 8 MB)
//   slot: 'baseline' | 'progress_30d' | 'progress_90d' | 'progress_180d'
//
// Replaces any existing photo in the same slot (removes old storage
// object + upserts metadata row). Storage RLS on the bucket enforces
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

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Missing file' }, { status: 400 });
  }
  if (typeof slotRaw !== 'string' || !ALLOWED_SLOTS.has(slotRaw)) {
    return NextResponse.json({ error: 'Invalid slot' }, { status: 400 });
  }
  if (!ALLOWED_MIMES.has(file.type)) {
    return NextResponse.json(
      { error: 'Only JPEG, PNG, or WebP images accepted' },
      { status: 400 },
    );
  }
  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json(
      { error: 'File too large (max 8 MB)' },
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
  const path = `${user.id}/${filename}.${ext}`;

  // If an older photo exists in this slot (possibly with a different
  // extension), remove it from storage first. The row upsert below
  // handles the DB side.
  const { data: existing } = await supabase
    .from('progress_photos')
    .select('storage_path')
    .eq('user_id', user.id)
    .eq('slot', slot)
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
      storage_path: path,
      captured_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,slot' },
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

  return NextResponse.json({ ok: true, slot, path });
}
