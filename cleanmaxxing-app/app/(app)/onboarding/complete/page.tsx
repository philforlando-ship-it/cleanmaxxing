import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { JourneyWelcome } from './journey-welcome';

// Picker labels mirror lib/onboarding/questions.ts focus_areas
// options. Includes legacy values so users mid-flow (or returning
// to a stale survey) still render with sensible labels.
const JOURNEY_LABELS: Record<string, string> = {
  hair: 'Hair',
  style: 'Style',
  body_composition: 'Body composition',
  strength: 'Strength',
  cardio: 'Cardio',
  sleep: 'Sleep',
  fitness: 'Fitness',
  skin: 'Skin',
  grooming: 'Grooming',
};

export default async function OnboardingCompletePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('users')
    .select('age_segment, onboarding_completed_at')
    .eq('id', user.id)
    .maybeSingle();

  // Already finished? Skip back to /today so the welcome screen
  // doesn't double-fire on a refresh.
  if (profile?.onboarding_completed_at) redirect('/today');
  if (!profile?.age_segment) redirect('/onboarding');

  // Same staging-marker guards as before — the entry redirector at
  // /onboarding routes here only after these are set, but bouncing
  // a direct visitor keeps the routing logic in one place.
  const { data: stagingRows } = await supabase
    .from('survey_responses')
    .select('question_key, response_value')
    .eq('user_id', user.id)
    .in('question_key', [
      'onboarding_review_acked',
      'onboarding_baseline_acked',
      'focus_areas',
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

  const focusRow = (stagingRows ?? []).find(
    (r) => r.question_key === 'focus_areas',
  );
  let journeyLabels: string[] = [];
  if (focusRow?.response_value) {
    try {
      const parsed = JSON.parse(focusRow.response_value as string);
      if (Array.isArray(parsed)) {
        journeyLabels = parsed
          .map((v) => JOURNEY_LABELS[v as string])
          .filter((l): l is string => Boolean(l));
      }
    } catch {
      // malformed — leave empty; the welcome screen handles that case
    }
  }

  return (
    <main className="mx-auto flex min-h-[100svh] max-w-xl flex-col px-6 py-10">
      <JourneyWelcome journeyLabels={journeyLabels} />
    </main>
  );
}
