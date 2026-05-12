import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

// Remove the user's stored MyFitnessPal credentials. Hard delete of
// the row — no soft-disable, because the ciphertext is the only
// thing that justifies keeping the row, and we don't want to retain
// it after the user says stop.
//
// Authenticated (not premium-gated) — a downgraded user must always
// be able to disconnect, even if their connect path is now blocked.

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  }

  const service = createServiceClient();
  const { error } = await service
    .from('mfp_integrations')
    .delete()
    .eq('user_id', user.id);

  if (error) {
    return NextResponse.json(
      { error: 'db_delete_failed', message: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
