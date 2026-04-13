import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ContinueAnywayButton } from './continue-button';

export default async function ClinicalResourcesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  return (
    <main className="mx-auto flex min-h-[100svh] max-w-xl flex-col px-6 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">
        Before you continue
      </h1>
      <p className="mt-4 text-base text-zinc-700 dark:text-zinc-300">
        You told us you&rsquo;ve been treated for an eating disorder, body dysmorphic
        disorder, or OCD. Cleanmaxxing is a self-improvement product, not a clinical
        service, and some of what we do &mdash; tracking goals, measuring
        confidence &mdash; can overlap with patterns that make these conditions
        worse for some people.
      </p>
      <p className="mt-4 text-base text-zinc-700 dark:text-zinc-300">
        If you&rsquo;re working with a clinician right now, we&rsquo;d genuinely rather
        you talk to them before using this product. If you&rsquo;re not, here are
        two places to start:
      </p>

      <ul className="mt-4 space-y-3 text-sm">
        <li className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
          <strong className="block">National Alliance for Eating Disorders</strong>
          <span className="text-zinc-600 dark:text-zinc-400">
            Helpline and clinician directory.
          </span>
          <a
            href="https://www.allianceforeatingdisorders.com/find-help/"
            target="_blank"
            rel="noreferrer noopener"
            className="mt-1 block text-zinc-900 underline dark:text-zinc-100"
          >
            allianceforeatingdisorders.com
          </a>
        </li>
        <li className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
          <strong className="block">International OCD Foundation</strong>
          <span className="text-zinc-600 dark:text-zinc-400">
            Find a therapist familiar with OCD and BDD.
          </span>
          <a
            href="https://iocdf.org/find-help/"
            target="_blank"
            rel="noreferrer noopener"
            className="mt-1 block text-zinc-900 underline dark:text-zinc-100"
          >
            iocdf.org/find-help
          </a>
        </li>
      </ul>

      <p className="mt-6 text-sm text-zinc-600 dark:text-zinc-400">
        You can still use Cleanmaxxing if you want to. We just wanted you to see
        this first.
      </p>

      <div className="mt-8 flex items-center justify-between">
        <Link
          href="/login"
          className="text-sm text-zinc-600 underline dark:text-zinc-400"
        >
          Take a break
        </Link>
        <ContinueAnywayButton />
      </div>
    </main>
  );
}
