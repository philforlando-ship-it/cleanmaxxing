import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { questionAt, QUESTION_COUNT } from '@/lib/onboarding/questions';
import { QuestionForm } from './question-form';

type Params = { step: string };

export default async function OnboardingStepPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { step: stepParam } = await params;
  const step = parseInt(stepParam, 10);
  if (Number.isNaN(step) || step < 0) redirect('/onboarding');

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const question = questionAt(step);
  if (!question) redirect('/onboarding/finalize');

  // Pull any existing answer for this question so the user can edit it on resume.
  const { data: existing } = await supabase
    .from('survey_responses')
    .select('response_value')
    .eq('user_id', user.id)
    .eq('question_key', question.key)
    .maybeSingle();

  // For the motivation question, also pull any prior follow-up detail so the
  // conditional textarea can pre-fill when the user comes back.
  let initialDetail: string | null = null;
  if (question.key === 'motivation_segment') {
    const { data: detail } = await supabase
      .from('survey_responses')
      .select('response_value')
      .eq('user_id', user.id)
      .eq('question_key', 'motivation_specific_detail')
      .maybeSingle();
    initialDetail = detail?.response_value ?? null;
  }

  return (
    <main className="mx-auto flex min-h-[100svh] max-w-xl flex-col px-6 py-10">
      <div className="mb-8">
        <div className="mb-2 flex items-center justify-between text-xs text-zinc-500">
          <span>Question {step + 1} of {QUESTION_COUNT}</span>
          <span className="flex items-center gap-3">
            <span>{Math.round(((step + 1) / QUESTION_COUNT) * 100)}%</span>
            <form action="/api/auth/signout" method="post">
              <button type="submit" className="underline hover:text-zinc-900 dark:hover:text-zinc-100">
                Sign out
              </button>
            </form>
          </span>
        </div>
        <div className="h-1 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
          <div
            className="h-full bg-zinc-900 transition-[width] duration-300 dark:bg-zinc-100"
            style={{ width: `${((step + 1) / QUESTION_COUNT) * 100}%` }}
          />
        </div>
      </div>

      <QuestionForm
        step={step}
        question={question}
        initialValue={existing?.response_value ?? null}
        initialDetail={initialDetail}
        isLast={step === QUESTION_COUNT - 1}
      />
    </main>
  );
}
