// POST /api/plan/trt/screening
// Persists the 3-question gate that sits in front of the TRT
// Considering content. Stored on survey_responses with key
// 'trt_screening_v1' so future visits skip the gate. Same pattern as
// /api/plan/glp1/screening — no migration, single KV row.

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

const SCREENING_KEY = 'trt_screening_v1';

const PostSchema = z.object({
  reason: z.enum([
    'symptoms_low_t',
    'lab_confirmed_low',
    'aesthetic_performance',
    'curiosity',
    'other',
  ]),
  lab_status: z.enum([
    'recent_low_confirmed',
    'recent_normal_range',
    'older_results',
    'no_labs_yet',
    'not_sure',
  ]),
  horizon: z.enum([
    'next_3_months',
    'next_year',
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
    console.error('trt_screening_save_failed', error);
    return NextResponse.json(
      { error: 'Could not save screening.' },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
