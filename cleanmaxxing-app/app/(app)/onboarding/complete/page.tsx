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

  return (
    <main className="mx-auto flex min-h-[100svh] max-w-xl flex-col px-6 py-10">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">
          Here are your three starter goals
        </h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Based on your age and focus areas. You can swap any of them, then start.
        </p>
      </header>
      <GoalsPicker />
    </main>
  );
}
