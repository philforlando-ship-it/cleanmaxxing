// POST /api/plan/hair/stage-4/log
// Records today's daily-routine check-in. Idempotent — a second tap on
// the same app-day is a no-op (PK conflict on (user_id, on_date)).
//
// Returns the new count + completion flag so the client can reflect the
// state without a full page round-trip if it wants to.

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getHairAssessment, logHairRoutineForToday } from '@/lib/hair/service';
import { appDayFor } from '@/lib/date/app-day';

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const assessment = await getHairAssessment(supabase, user.id);
  if (!assessment) {
    return NextResponse.json(
      { error: 'No hair assessment on file.' },
      { status: 400 },
    );
  }
  if (!assessment.stage_4_started_at) {
    return NextResponse.json(
      { error: 'Start Stage 4 before logging.' },
      { status: 400 },
    );
  }
  if (assessment.stage_4_completed_at) {
    // Stage 4 is complete. Logging more is fine in principle but the
    // gate already fired; return success without re-counting so the
    // client UX is consistent.
    return NextResponse.json({ ok: true, count: null, isComplete: true });
  }

  // Pull the user's IANA timezone so the routine logs against the
  // user's app-day (3am rollover), not server-local midnight.
  const { data: userRow } = await supabase
    .from('users')
    .select('timezone')
    .eq('id', user.id)
    .maybeSingle();
  const timezone =
    (userRow as { timezone: string | null } | null)?.timezone ??
    'America/New_York';
  const todayAppDay = appDayFor(timezone);

  let result;
  try {
    result = await logHairRoutineForToday(supabase, user.id, todayAppDay);
  } catch (err) {
    console.error('hair_stage_4_log_failed', err);
    return NextResponse.json(
      { error: 'Could not log today’s routine.' },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    count: result.count,
    isComplete: result.isComplete,
  });
}
