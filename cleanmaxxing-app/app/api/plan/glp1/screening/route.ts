// POST /api/plan/glp1/screening
// Persists the 3-question gate that sits in front of the GLP-1
// Considering content dump. Stored on survey_responses with key
// 'glp1_screening_v1' so future visits skip the gate. Same pattern as
// monthly_checkpoint_dismissed_at — single KV row, no migration.

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

const SCREENING_KEY = 'glp1_screening_v1';

const PostSchema = z.object({
  reason: z.enum([
    'weight_loss',
    'metabolic_concern',
    'recommendation',
    'curiosity',
    'other',
  ]),
  prescriber_status: z.enum([
    'started_evaluation',
    'considering_evaluation',
    'not_yet',
    'no_intent_yet',
  ]),
  horizon: z.enum([
    'immediately',
    'next_3_months',
    'exploring',
    'unsure',
  ]),
});

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const parsed = PostSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request', issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const responseValue = JSON.stringify({
    ...parsed.data,
    answered_at: new Date().toISOString(),
  });

  const { error } = await supabase.from('survey_responses').upsert(
    {
      user_id: user.id,
      question_key: SCREENING_KEY,
      response_value: responseValue,
    },
    { onConflict: 'user_id,question_key' },
  );
  if (error) {
    console.error('glp1_screening_save_failed', error);
    return NextResponse.json(
      { error: 'Could not save screening.' },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
