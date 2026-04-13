import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function OnboardingCompletePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  return (
    <main className="mx-auto flex min-h-[100svh] max-w-xl flex-col items-center justify-center px-6 py-10 text-center">
      <h1 className="text-3xl font-semibold tracking-tight">You&rsquo;re set.</h1>
      <p className="mt-4 text-base text-zinc-600 dark:text-zinc-400">
        Goal suggestions are coming in the next build. For now, head to Today.
      </p>
      <Link
        href="/today"
        className="mt-8 rounded-lg bg-zinc-900 px-6 py-3 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
      >
        Go to Today
      </Link>
    </main>
  );
}
