// POST /api/strength/recovery-check
// Writes a strength_session_feedback row from the /today morning-after
// recovery-check card. Idempotent at the DB layer via the unique
// (workout_log_id, recorded_on) index.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  RecoveryCheckInputSchema,
  saveRecoveryCheck,
} from '@/lib/strength/feedback';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = RecoveryCheckInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid recovery check payload' },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await saveRecoveryCheck(supabase, user.id, parsed.data);
  } catch (err) {
    // Unique-violation = already submitted. Treat as success so the
    // tile can disappear quietly rather than surfacing a confusing
    // error to the user.
    const message = (err as { message?: string }).message ?? '';
    if (message.includes('strength_session_feedback_workout_day_unique')) {
      return NextResponse.json({ ok: true, already_submitted: true });
    }
    console.error('strength_recovery_check_save_failed', err);
    return NextResponse.json(
      { error: 'Could not save recovery check' },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
