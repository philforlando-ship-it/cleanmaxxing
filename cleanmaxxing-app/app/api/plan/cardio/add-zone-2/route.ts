// POST /api/plan/cardio/add-zone-2
// Stage transition: NEAT-only → add structured Zone 2. Bumps the
// assessment's days_per_week from '0_days' to '1_2_days', stamps
// zone_2_layer_started_at, and re-runs the cardio report so the
// prescription updates to include 2 Zone 2 sessions a week.

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCardioAssessment } from '@/lib/cardio/service';
import { generateAndSaveCardioReport } from '@/lib/cardio/generate-report';

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const assessment = await getCardioAssessment(supabase, user.id);
  if (!assessment) {
    return NextResponse.json({ error: 'no_assessment' }, { status: 400 });
  }

  await supabase
    .from('cardio_assessments')
    .update({
      days_per_week: '1_2_days',
      zone_2_layer_started_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', user.id);

  const refreshed = await getCardioAssessment(supabase, user.id);

  try {
    await generateAndSaveCardioReport(
      supabase,
      user.id,
      refreshed ?? assessment,
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('cardio_add_zone_2_failed', err);
    return NextResponse.json(
      { error: 'generation_failed', message: (err as Error).message },
      { status: 500 },
    );
  }
}
