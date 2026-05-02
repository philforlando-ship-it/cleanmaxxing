import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { GoalsPicker } from './goals-picker';

export default async function OnboardingCompletePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Require the survey to have been submitted (age_segment set by submit route).
  // Users who hit this URL directly without finishing the survey get bounced.
  const { data: profile } = await supabase
    .from('users')
    .select('age_segment')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile?.age_segment) {
    redirect('/onboarding');
  }

  // Make sure the user has been through the post-survey staging
  // steps (review + baseline-photo). Bouncing back to the entry
  // redirector keeps the routing logic in one place — it knows
  // exactly where to send them next based on which marker / photo
  // is missing. Hitting /onboarding/complete directly can't skip
  // those steps as a result.
  const { data: stagingRows } = await supabase
    .from('survey_responses')
    .select('question_key')
    .eq('user_id', user.id)
    .in('question_key', [
      'onboarding_review_acked',
      'onboarding_baseline_acked',
    ]);
  const stagingMarkers = new Set(
    (stagingRows ?? []).map((r) => r.question_key as string),
  );
  if (!stagingMarkers.has('onboarding_review_acked')) {
    redirect('/onboarding');
  }
  if (!stagingMarkers.has('onboarding_baseline_acked')) {
    const { data: baselineRow } = await supabase
      .from('progress_photos')
      .select('id')
      .eq('user_id', user.id)
      .eq('slot', 'baseline')
      .maybeSingle();
    if (!baselineRow) redirect('/onboarding');
  }

  // Personalisation inputs for the "why these three?" explainer. Pulled
  // server-side so the first render already has the user's segment +
  // focus areas embedded — no loading flicker on the header copy.
  const { data: focusRow } = await supabase
    .from('survey_responses')
    .select('response_value')
    .eq('user_id', user.id)
    .eq('question_key', 'focus_areas')
    .maybeSingle();

  let focusAreas: string[] = [];
  if (focusRow?.response_value) {
    try {
      const parsed = JSON.parse(focusRow.response_value);
      if (Array.isArray(parsed)) focusAreas = parsed;
    } catch {
      // treat as empty
    }
  }

  return (
    <main className="mx-auto flex min-h-[100svh] max-w-xl flex-col px-6 py-10">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">
          Here are your three starter goals
        </h1>
      </header>
      <GoalsPicker
        ageSegment={profile.age_segment as string}
        focusAreas={focusAreas}
      />
    </main>
  );
}
