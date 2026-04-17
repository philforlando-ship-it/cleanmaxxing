import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { questionByKey } from '@/lib/onboarding/questions';

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  let body: {
    question_key?: string;
    response_value?: string | null;
    // Optional follow-up text tied to the current answer. Only honored for
    // motivation_segment today — persisted as a separate survey_responses
    // row under key `motivation_specific_detail`.
    detail?: string | null;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { question_key, response_value, detail } = body;
  if (!question_key) {
    return NextResponse.json({ error: 'Missing question_key' }, { status: 400 });
  }

  const question = questionByKey(question_key);
  if (!question) {
    return NextResponse.json({ error: 'Unknown question' }, { status: 400 });
  }

  if (question.required && (response_value === null || response_value === undefined || response_value === '')) {
    return NextResponse.json({ error: 'This question is required.' }, { status: 400 });
  }

  // Hard 18+ gate at persistence time (client also checks, but never trust the client).
  if (question_key === 'age' && response_value !== null && response_value !== undefined) {
    const n = Number(response_value);
    if (Number.isNaN(n) || n < 18) {
      return NextResponse.json({ error: 'Cleanmaxxing is 18+ only.' }, { status: 400 });
    }
  }

  // Delete any prior row for this key, then insert. Simpler and more reliable
  // than crafting an ON CONFLICT target that doesn't exist in the schema.
  const { error: delErr } = await supabase
    .from('survey_responses')
    .delete()
    .eq('user_id', user.id)
    .eq('question_key', question_key);
  if (delErr) {
    return NextResponse.json({ error: delErr.message }, { status: 500 });
  }

  const { error: insErr } = await supabase.from('survey_responses').insert({
    user_id: user.id,
    question_key,
    response_value: response_value ?? '',
  });
  if (insErr) {
    return NextResponse.json({ error: insErr.message }, { status: 500 });
  }

  // Follow-up detail on the motivation question. Wipe any prior detail row
  // regardless of current choice so that swapping from the "specific
  // bothering" option back to another segment doesn't leave stale text.
  if (question_key === 'motivation_segment') {
    await supabase
      .from('survey_responses')
      .delete()
      .eq('user_id', user.id)
      .eq('question_key', 'motivation_specific_detail');

    const trimmed = typeof detail === 'string' ? detail.trim() : '';
    if (
      response_value === 'something-specific-bothering-me' &&
      trimmed.length > 0
    ) {
      const { error: detailErr } = await supabase
        .from('survey_responses')
        .insert({
          user_id: user.id,
          question_key: 'motivation_specific_detail',
          response_value: trimmed.slice(0, 500),
        });
      if (detailErr) {
        return NextResponse.json({ error: detailErr.message }, { status: 500 });
      }
    }
  }

  return NextResponse.json({ ok: true });
}
