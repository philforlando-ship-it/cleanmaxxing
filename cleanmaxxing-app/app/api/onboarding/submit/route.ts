import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ageToSegment, QUESTIONS } from '@/lib/onboarding/questions';

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { data: rows, error: rowsErr } = await supabase
    .from('survey_responses')
    .select('question_key, response_value')
    .eq('user_id', user.id);
  if (rowsErr) {
    return NextResponse.json({ error: rowsErr.message }, { status: 500 });
  }

  const byKey = new Map((rows ?? []).map((r) => [r.question_key, r.response_value]));

  // Every required question must have a row.
  const missing = QUESTIONS.filter((q) => q.required && !byKey.has(q.key)).map((q) => q.key);
  if (missing.length > 0) {
    return NextResponse.json(
      { error: `Missing required answers: ${missing.join(', ')}` },
      { status: 400 }
    );
  }

  const ageRaw = byKey.get('age');
  const age = ageRaw ? Number(ageRaw) : NaN;
  if (Number.isNaN(age) || age < 18) {
    return NextResponse.json({ error: 'Age must be 18+.' }, { status: 400 });
  }
  const segment = ageToSegment(age);
  // Belt-and-suspenders: the onboarding survey caps age at 45 via the
  // question's max, but a direct POST with a larger age would slip past
  // that client-side check and leave age_segment null downstream (which
  // creates a redirect loop between /onboarding and /onboarding/complete).
  // Reject explicitly at the API so the failure is a clear 400 instead.
  if (segment === null) {
    return NextResponse.json(
      { error: 'Cleanmaxxing is currently designed for men 18\u201355.' },
      { status: 400 },
    );
  }

  const clinicalFlagged = byKey.get('clinical_screen') === 'yes';

  const MOTIVATION_VALUES = new Set([
    'feel-better-in-own-skin',
    'social-professional-confidence',
    'specific-event',
    'structured-plan',
    'something-specific-bothering-me',
    'maintenance-aging',
    'not-sure-yet',
  ]);
  const motivationRaw = byKey.get('motivation_segment');
  const motivationSegment =
    motivationRaw && MOTIVATION_VALUES.has(motivationRaw) ? motivationRaw : null;

  // Only carry the follow-up detail through when it's semantically tied to
  // the segment that triggered it. Swapping segments after-the-fact should
  // null it out even if a stale row somehow survived.
  const detailRaw = byKey.get('motivation_specific_detail');
  const motivationSpecificDetail =
    motivationSegment === 'something-specific-bothering-me' &&
    typeof detailRaw === 'string' &&
    detailRaw.trim().length > 0
      ? detailRaw.trim().slice(0, 500)
      : null;

  // Persist confidence_dimensions rows from the slider answers for baseline tracking.
  // The redundant 'overall' slider was dropped from the onboarding flow in 0.4;
  // the four dimensions cover the same ground without asking the user to
  // consolidate them. Existing 'overall' rows from prior users remain valid;
  // the table's enum still permits the value.
  const confidenceMap: Array<{ key: string; dimension: 'appearance' | 'social' | 'career' | 'physical' | 'overall' }> = [
    { key: 'confidence_appearance', dimension: 'appearance' },
    { key: 'confidence_social', dimension: 'social' },
    { key: 'confidence_work', dimension: 'career' },
    { key: 'confidence_physical', dimension: 'physical' },
  ];

  const confidenceRows = confidenceMap
    .map(({ key, dimension }) => {
      const v = byKey.get(key);
      const score = v ? Number(v) : NaN;
      if (Number.isNaN(score)) return null;
      return {
        user_id: user.id,
        dimension,
        baseline_score: score,
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  // Wipe any prior baseline (onboarding should only fire once, but be defensive).
  await supabase.from('confidence_dimensions').delete().eq('user_id', user.id);
  if (confidenceRows.length > 0) {
    const { error: confErr } = await supabase.from('confidence_dimensions').insert(confidenceRows);
    if (confErr) {
      return NextResponse.json({ error: confErr.message }, { status: 500 });
    }
  }

  // Note: onboarding_completed_at is NOT set here. It gets set by
  // /api/goals/accept once the user actually picks starter goals.
  // Until then, age_segment serves as the "survey submitted" signal.
  const { error: userErr } = await supabase
    .from('users')
    .update({
      age,
      age_segment: segment,
      clinical_screen_flagged: clinicalFlagged,
      motivation_segment: motivationSegment,
      motivation_specific_detail: motivationSpecificDetail,
    })
    .eq('id', user.id);
  if (userErr) {
    return NextResponse.json({ error: userErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, age_segment: segment });
}
