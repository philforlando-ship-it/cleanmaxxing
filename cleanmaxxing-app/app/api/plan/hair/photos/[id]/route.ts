// DELETE /api/plan/hair/photos/[id]
// Delete a single hair photo (removes both the DB row and the storage
// file). User can delete from any session, open or completed. Best-
// effort storage cleanup — the DB row is the source of truth.
//
// Cascade: any hair_photo_analyses rows that reference the photo's
// session (on either side of the comparison) are deleted alongside.
// Matches the /privacy/photos commitment that deleting a photo also
// removes the AI observations derived from it. Granularity is per-
// session because hair_photo_analyses references session_id, not the
// individual photo row.

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { deleteHairPhotoRow, getHairPhotoById } from '@/lib/hair/photos/service';

const BUCKET = 'progress-photos';

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  if (!id) {
    return NextResponse.json({ error: 'Missing photo id' }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const photo = await getHairPhotoById(supabase, user.id, id);
  if (!photo) {
    return NextResponse.json({ error: 'Photo not found' }, { status: 404 });
  }

  // Storage delete is best-effort; we still proceed with the row
  // delete so the user always sees a successful removal in the UI.
  await supabase.storage
    .from(BUCKET)
    .remove([photo.storage_path])
    .catch(() => {});

  try {
    await deleteHairPhotoRow(supabase, user.id, id);
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }

  // Cascade derived analyses tied to this photo's session.
  await supabase
    .from('hair_photo_analyses')
    .delete()
    .eq('user_id', user.id)
    .eq('before_session_id', photo.session_id);
  await supabase
    .from('hair_photo_analyses')
    .delete()
    .eq('user_id', user.id)
    .eq('after_session_id', photo.session_id);

  return NextResponse.json({ ok: true });
}
