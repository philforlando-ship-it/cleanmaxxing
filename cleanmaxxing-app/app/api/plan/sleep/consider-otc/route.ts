// POST /api/plan/sleep/consider-otc
// Stamps otc_supplements_considered_at on the sleep assessment.
// Doesn't regenerate the report — the OTC layer is content the
// report already names; this gate just acknowledges the user has
// moved past behavioral-only and is opting in to the supplement
// conversation. The /today commitments tile can later use this as
// a signal to surface supplement reminders.

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

  const { error } = await supabase
    .from('sleep_assessments')
    .update({
      otc_supplements_considered_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
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
