import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { nextStepIndex } from '@/lib/onboarding/progress';
import { QUESTION_COUNT } from '@/lib/onboarding/questions';
import { FinalizeClient } from './finalize-client';

export default async function FinalizePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: rows } = await supabase
    .from('survey_responses')
    .select('question_key, response_value')
    .eq('user_id', user.id);

  const answered = new Set((rows ?? []).map((r) => r.question_key));
  if (nextStepIndex(answered) < QUESTION_COUNT) {
    // User somehow got here with unanswered required questions.
    redirect('/onboarding');
  }

  const clinicalRow = (rows ?? []).find((r) => r.question_key === 'clinical_screen');
  const flagged = clinicalRow?.response_value === 'yes';

  if (flagged) {
    redirect('/onboarding/clinical-resources');
  }

  return <FinalizeClient />;
}
