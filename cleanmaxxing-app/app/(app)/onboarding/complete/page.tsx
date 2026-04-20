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
