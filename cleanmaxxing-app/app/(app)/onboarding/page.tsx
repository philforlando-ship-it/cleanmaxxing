import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { nextStepIndex } from '@/lib/onboarding/progress';
import { QUESTION_COUNT } from '@/lib/onboarding/questions';

export default async function OnboardingEntryPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: rows } = await supabase
    .from('survey_responses')
    .select('question_key')
    .eq('user_id', user.id);

  const answered = new Set((rows ?? []).map((r) => r.question_key));
  const next = nextStepIndex(answered);

  if (next >= QUESTION_COUNT) redirect('/onboarding/finalize');
  redirect(`/onboarding/${next}`);
}
