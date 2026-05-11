// POST /api/plan/facial-structure/photo-session-logged
// Stamps facial_structure_assessments.last_facial_photo_logged_at with
// the current time. Called by the /today monthly-photo-due tile when
// the user confirms they've taken this month's same-conditions photo.
//
// No body — the action is idempotent at the "you took it this month"
// level; multiple calls just keep stamping the latest timestamp.

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const now = new Date().toISOString();
  const { error } = await supabase
    .from('facial_structure_assessments')
    .update({
      last_facial_photo_logged_at: now,
      updated_at: now,
    })
    .eq('user_id', user.id);
  if (error) {
    return NextResponse.json(
      { error: 'save_failed', message: error.message },
      { status: 500 },
    );
  }
  return NextResponse.json({ ok: true });
}
