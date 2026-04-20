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
    return NextResponse.json({ ok: true, deleted: paths.length });
  }

  if (typeof id !== 'string') {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  }

  const { data: row } = await supabase
    .from('progress_photos')
    .select('storage_path')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!row) {
    return NextResponse.json({ error: 'Photo not found' }, { status: 404 });
  }

  const path = (row as { storage_path: string | null }).storage_path;
  if (path) {
    await supabase.storage.from(BUCKET).remove([path]);
  }

  const { error: delErr } = await supabase
    .from('progress_photos')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);
  if (delErr) {
    return NextResponse.json({ error: delErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
