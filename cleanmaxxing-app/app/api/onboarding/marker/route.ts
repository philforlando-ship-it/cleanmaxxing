// Onboarding marker endpoint. Stores small "user has seen X step"
// flags as rows in survey_responses. Separate from /answer because
// /answer validates against questionByKey — markers are not survey
// questions, they're acknowledgement flags for the post-survey
// flow (review screen acked, baseline-photo step acked).
//
// Allowed keys are explicitly listed so a misbehaving client can't
// pollute survey_responses with arbitrary rows. Values are normalized
// to '1' so reads are a simple equality check downstream.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const ALLOWED_MARKERS = new Set<string>([
  'onboarding_review_acked',
  'onboarding_baseline_acked',
]);

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { marker?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const marker = body.marker;
  if (!marker || !ALLOWED_MARKERS.has(marker)) {
    return NextResponse.json({ error: 'Unknown marker' }, { status: 400 });
  }

  // Idempotent upsert pattern: delete prior, insert fresh. Mirrors
  // /api/onboarding/answer's approach to avoid relying on a unique
  // constraint that doesn't exist on (user_id, question_key).
  await supabase
    .from('survey_responses')
    .delete()
    .eq('user_id', user.id)
    .eq('question_key', marker);

  const { error } = await supabase.from('survey_responses').insert({
    user_id: user.id,
    question_key: marker,
    response_value: '1',
  });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
