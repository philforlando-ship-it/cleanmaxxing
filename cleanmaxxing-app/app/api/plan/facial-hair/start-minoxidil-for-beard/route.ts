// POST /api/plan/facial-hair/start-minoxidil-for-beard
// Stamps minoxidil_for_beard_started_at on the facial-hair
// assessment + re-runs the report. The prompt's modifier handling
// for this milestone shifts framing from "consider minoxidil" to
// month-band guidance (0-3 mo shedding phase, etc.).

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  getFacialHairAssessment,
  markMinoxidilForBeardStarted,
} from '@/lib/facial-hair/service';
import { generateAndSaveFacialHairReport } from '@/lib/facial-hair/generate-report';

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    await markMinoxidilForBeardStarted(supabase, user.id);
  } catch (err) {
    if ((err as Error).message === 'no_assessment') {
      return NextResponse.json({ error: 'no_assessment' }, { status: 400 });
    }
    throw err;
  }

  const refreshed = await getFacialHairAssessment(supabase, user.id);
  if (!refreshed) {
    return NextResponse.json({ error: 'no_assessment' }, { status: 400 });
  }

  try {
    await generateAndSaveFacialHairReport(supabase, user.id, refreshed);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('facial_hair_start_minoxidil_failed', err);
    return NextResponse.json(
      { error: 'generation_failed', message: (err as Error).message },
      { status: 500 },
    );
  }
}
