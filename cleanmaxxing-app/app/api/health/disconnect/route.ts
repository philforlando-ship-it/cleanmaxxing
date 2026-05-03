import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { getVitalClient } from '@/lib/vital/client';

// Disconnects the user's health integration. Deletes the Vital
// user (which cascades on Vital's side and stops further webhooks)
// and removes the health_integrations row.
//
// Existing sleep_logs and daily_activity rows that came from Vital
// are left in place — historical data the user generated. The
// user can delete individual entries if they want them gone.

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  }

  const service = createServiceClient();

  const { data: rows } = await service
    .from('health_integrations')
    .select('id, vital_user_id')
    .eq('user_id', user.id);

  if (!rows || rows.length === 0) {
    return NextResponse.json({ ok: true, message: 'nothing to disconnect' });
  }

  const vital = getVitalClient();
  if (vital) {
    // Delete each Vital user we know about. Best effort — if Vital
    // returns an error we still remove our local row, otherwise the
    // user is stuck unable to disconnect from a transient Vital
    // outage.
    const seen = new Set<string>();
    for (const r of rows) {
      const id = r.vital_user_id as string;
      if (seen.has(id)) continue;
      seen.add(id);
      try {
        await vital.user.delete(id);
      } catch {
        // swallow — log surface would go here in a real
        // observability setup
      }
    }
  }

  await service
    .from('health_integrations')
    .delete()
    .eq('user_id', user.id);

  return NextResponse.json({ ok: true });
}
