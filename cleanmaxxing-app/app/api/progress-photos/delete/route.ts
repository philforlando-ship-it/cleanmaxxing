import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const BUCKET = 'progress-photos';

// Delete a single progress photo by id, or all of the user's photos.
// Body: { id: string } for one, or { id: 'all' } for bulk.
//
// Removes the storage object first, then the metadata row. If either
// step fails, we return the error — the user can retry. We prefer
// leaving an orphan row over an orphan file (users can still click
// the delete button on a row that no longer has a storage object
// and we'll no-op the storage removal gracefully).
//
// Cascade to derived AI rows (matches the /privacy/photos commitment
// that deletion clears analyses derived from the deleted photo):
//   - Single delete of a FRONT FACE photo: wipe facial_analyses rows
//     for the user that reference that exact (slot, captured_at).
//     The analyses snapshot the front photo's captured_at, so this
//     is the precise match. Deleting an optional extra angle (close
//     or side) leaves the historical record alone since the front is
//     still present.
//   - Single delete of a BASELINE FRONT FACE photo: also null out
//     facial_structure_assessments.photo_features (overwrite-in-place
//     column with no row history to preserve).
//   - Single delete of body or fit photos: no cascade. Those photos
//     never feed an analysis row.
//   - Bulk "all" delete: wipe every facial_analyses row for the user
//     and null photo_features. The user asked for a clean slate.
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  let body: { id?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const id = body.id;

  if (id === 'all') {
    const { data: rows } = await supabase
      .from('progress_photos')
      .select('id, storage_path')
      .eq('user_id', user.id);

    const paths = (rows ?? [])
      .map((r) => (r as { storage_path: string | null }).storage_path)
      .filter((p): p is string => Boolean(p));

    if (paths.length > 0) {
      await supabase.storage.from(BUCKET).remove(paths);
    }
    const { error: delErr } = await supabase
      .from('progress_photos')
      .delete()
      .eq('user_id', user.id);
    if (delErr) {
      return NextResponse.json({ error: delErr.message }, { status: 500 });
    }

    // Cascade: clear every derived analysis row + the photo-features
    // column on the facial-structure assessment. Failures here are
    // surfaced because the policy commitment depends on this running.
    await supabase.from('facial_analyses').delete().eq('user_id', user.id);
    await supabase
      .from('facial_structure_assessments')
      .update({
        photo_features: null,
        photo_features_at: null,
        photo_features_model: null,
        photo_features_refused: null,
        photo_features_refusal_reason: null,
      })
      .eq('user_id', user.id);

    return NextResponse.json({ ok: true, deleted: paths.length });
  }

  if (typeof id !== 'string') {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  }

  const { data: row } = await supabase
    .from('progress_photos')
    .select('storage_path, slot, angle, category, captured_at')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!row) {
    return NextResponse.json({ error: 'Photo not found' }, { status: 404 });
  }

  const typed = row as {
    storage_path: string | null;
    slot: string;
    angle: string;
    category: string;
    captured_at: string | null;
  };

  if (typed.storage_path) {
    await supabase.storage.from(BUCKET).remove([typed.storage_path]);
  }

  const { error: delErr } = await supabase
    .from('progress_photos')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);
  if (delErr) {
    return NextResponse.json({ error: delErr.message }, { status: 500 });
  }

  // Cascade for the single-photo case. Only front face photos feed
  // facial_analyses (front is mandatory at every milestone, and the
  // analysis row snapshots the front's captured_at). Optional extras
  // are not cascaded because the historical analysis is still a valid
  // record of what was observed at the time.
  if (
    typed.category === 'face' &&
    typed.angle === 'front' &&
    typed.captured_at
  ) {
    // Two passes — analyses where the deleted photo was the "before"
    // side, then where it was the "after" side. Cleaner than nesting
    // an .or() with AND clauses around a timestamp literal.
    await supabase
      .from('facial_analyses')
      .delete()
      .eq('user_id', user.id)
      .eq('before_slot', typed.slot)
      .eq('before_captured_at', typed.captured_at);
    await supabase
      .from('facial_analyses')
      .delete()
      .eq('user_id', user.id)
      .eq('after_slot', typed.slot)
      .eq('after_captured_at', typed.captured_at);

    if (typed.slot === 'baseline') {
      await supabase
        .from('facial_structure_assessments')
        .update({
        photo_features: null,
        photo_features_at: null,
        photo_features_model: null,
        photo_features_refused: null,
        photo_features_refusal_reason: null,
      })
        .eq('user_id', user.id);
    }
  }

  return NextResponse.json({ ok: true });
}
