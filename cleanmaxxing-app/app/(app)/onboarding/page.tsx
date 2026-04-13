import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { nextStepIndex } from '@/lib/onboarding/progress';
import { QUESTION_COUNT } from '@/lib/onboarding/questions';

export default async function OnboardingEntryPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // If the survey has already been submitted, the user is just missing goals.
  const { data: profile } = await supabase
    .from('users')
    .select('age_segment')
    .eq('id', user.id)
    .maybeSingle();

  if (profile?.age_segment) {
    redirect('/onboarding/complete');
  }

  const { data: rows } = await supabase
    .from('survey_responses')
    .select('question_key')
    .eq('user_id', user.id);

  const answered = new Set((rows ?? []).map((r) => r.question_key));
  const next = nextStepIndex(answered);

  if (next >= QUESTION_COUNT) redirect('/onboarding/finalize');
  redirect(`/onboarding/${next}`);
}
