import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

const ARTICLES: Array<{ href: string; title: string; description: string }> = [
  {
    href: '/other-info/pyramid',
    title: 'The Cleanmaxxing pyramid',
    description:
      'Where every intervention sits in the framework — foundation at the base, cosmetic procedures at the apex, hard refusals off the pyramid altogether. The order of operations most men skip.',
  },
  {
    href: '/other-info/two-layers',
    title: 'Appearance is two things at once',
    description:
      'The visual layer everyone optimizes for, and the second layer almost no one names. Why most men over 30 hit a wall doing pure-visual work, and what compounds with age instead.',
  },
  {
    href: '/other-info/tom-brady-face',
    title:
      'Tom Brady’s face and physique did more for his brand than seven rings',
    description:
      'A case study in the halo effect. How appearance counteracted the reasons people had to dislike Brady, and what Burrow and Dart show about the same pattern in the next generation.',
  },
  {
    href: '/other-info/is-clav-right',
    title: 'Is Clav right?',
    description:
      'A critical read of one of the most prominent voices in the category. What holds up, what’s partially right, and what’s wrong.',
  },
  {
    href: '/other-info/mister-p',
    title: 'Who is Mister P?',
    description:
      'The voice behind Cleanmaxxing. Where the corpus came from, and what he will and won’t help with.',
  },
];

export default async function OtherInfoPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="text-3xl font-semibold tracking-tight">Other Info</h1>
      <p className="mt-3 max-w-xl text-sm text-zinc-600 dark:text-zinc-400">
        The articles and background reading that shape Cleanmaxxing&rsquo;s
        posture.
      </p>

      <ul className="mt-10 flex flex-col gap-4">
        {ARTICLES.map(({ href, title, description }) => (
          <li key={href}>
            <Link
              href={href}
              className="block rounded-xl border border-zinc-200 bg-white p-5 transition hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700 dark:hover:bg-zinc-800/50"
            >
              <div className="text-base font-semibold leading-snug text-zinc-900 dark:text-zinc-100">
                {title}
              </div>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                {description}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
