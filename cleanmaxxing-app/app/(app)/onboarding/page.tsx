import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { nextStepIndex } from '@/lib/onboarding/progress';
import { QUESTION_COUNT, QUESTIONS } from '@/lib/onboarding/questions';

// Entry redirector. Routes the user to wherever the onboarding
// flow next needs them, honoring the post-survey staging steps
// (review → baseline-photo → goal pickup) that the older flow
// jumped over.
//
// State machine:
//   onboarding_completed_at set         → /today
//   age_segment set (survey submitted)  → review/baseline/complete by markers
//   any survey responses                → next unanswered question
//   nothing yet                         → /onboarding/intro (cadence preview)

export default async function OnboardingEntryPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('users')
    .select('age_segment, onboarding_completed_at')
    .eq('id', user.id)
    .maybeSingle();

  if (profile?.onboarding_completed_at) {
    redirect('/today');
  }

  const { data: rows } = await supabase
    .from('survey_responses')
    .select('question_key, response_value')
    .eq('user_id', user.id);

  const answeredKeysSet = new Set(
    (rows ?? []).map((r) => r.question_key as string),
  );
  // Survey-question answers only — markers (onboarding_*_acked) and the
  // motivation_specific_detail follow-up live in the same table but
  // aren't survey questions themselves and shouldn't influence
  // nextStepIndex. Filter to actual question keys.
  const questionKeys = new Set(QUESTIONS.map((q) => q.key));
  const answered = new Set(
    Array.from(answeredKeysSet).filter((k) => questionKeys.has(k)),
  );

  // Survey is submitted → fan out to the staging steps.
  if (profile?.age_segment) {
    const markerByKey = new Map<string, string>(
      (rows ?? [])
        .filter((r) =>
          [
            'onboarding_review_acked',
            'onboarding_baseline_acked',
          ].includes(r.question_key as string),
        )
        .map((r) => [
          r.question_key as string,
          (r.response_value as string | null) ?? '',
        ]),
    );
    if (markerByKey.get('onboarding_review_acked') !== '1') {
      redirect('/onboarding/review');
    }
    // The onboarding_baseline_acked marker is the only "step done"
    // signal. A baseline photo row alone no longer short-circuits —
    // the baseline-photo page surfaces optional extra angles after
    // the front-face baseline is captured, and the user has to
    // explicitly hit Continue (or Skip) to set the marker. Bouncing
    // past on photo presence would skip the extras opportunity.
    if (markerByKey.get('onboarding_baseline_acked') !== '1') {
      redirect('/onboarding/baseline-photo');
    }
    redirect('/onboarding/complete');
  }

  // No survey responses yet → preview the cadence before the first
  // question. The /onboarding/intro page guards itself with the same
  // check so a direct revisit doesn't loop a returning user through.
  if (answered.size === 0) redirect('/onboarding/intro');

  const next = nextStepIndex(answered);
  if (next >= QUESTION_COUNT) redirect('/onboarding/finalize');
  redirect(`/onboarding/${next}`);
}
