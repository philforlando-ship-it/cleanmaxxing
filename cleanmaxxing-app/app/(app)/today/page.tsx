import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function TodayPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="text-3xl font-semibold tracking-tight">Today</h1>
      <p className="mt-2 text-sm text-zinc-500">Signed in as {user.email}</p>

      <section className="mt-10 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-lg font-medium">Daily check-in</h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Goals will appear here after onboarding.
        </p>
      </section>

      <section className="mt-6 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-lg font-medium">Weekly confidence</h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Your weekly reflection chart will live here.
        </p>
      </section>

      <section className="mt-6 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-lg font-medium">Ask Mister P</h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Chat entry point (Week 4).
        </p>
      </section>
    </main>
  );
}
