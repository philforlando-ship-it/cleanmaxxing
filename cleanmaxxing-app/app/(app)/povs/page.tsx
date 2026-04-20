// POV index scoped to the user's own goals. Users see the docs behind
// the goals they've actually picked, not the full 60-doc corpus — the
// corpus exists for educational grounding, the viewer exists for depth
// on what the user is working on right now.

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { povExists, povTitleFor } from '@/lib/content/pov';
import { plainLanguageFor } from '@/lib/content/plain-language';
import metadataRaw from '@/content/povs/_metadata.json';

type TierKey =
  | 'tier-1'
  | 'tier-2'
  | 'tier-3'
  | 'tier-4'
  | 'tier-5'
  | 'conditional-tier-1'
  | 'advanced'
  | 'meta'
  | 'monitor'
  | 'avoid';

const TIER_LABELS: Record<TierKey, string> = {
  'tier-1': 'Foundation',
  'tier-2': 'High impact',
  'tier-3': 'Refinement',
  'tier-4': 'Top performers',
  'tier-5': 'Polish',
  'conditional-tier-1': 'Situational',
  'advanced': 'Advanced',
  'meta': 'System & safety',
  'monitor': 'Monitor',
  'avoid': 'Avoid',
};

const TIER_ORDER: TierKey[] = [
  'tier-1',
  'tier-2',
  'tier-3',
  'tier-4',
  'tier-5',
  'conditional-tier-1',
  'advanced',
  'meta',
  'monitor',
  'avoid',
];

type PovMetaEntry = {
  priority_tier?: string;
  category?: string;
};

const metadata = metadataRaw as Record<string, PovMetaEntry | unknown>;

function tierFor(slug: string): TierKey | null {
  const entry = metadata[slug];
  if (!entry || typeof entry !== 'object') return null;
  const tier = (entry as PovMetaEntry).priority_tier;
  if (!tier) return null;
  if ((TIER_ORDER as string[]).includes(tier)) return tier as TierKey;
  return null;
}

export default async function PovsIndexPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Pull every source_slug the user has ever accepted, regardless of
  // status. Completed and abandoned goals still get their POV listed —
  // a user who just finished a goal may want to revisit the doc, and
  // an abandoned goal's doc is still relevant reference material.
  const { data: goalsRaw } = await supabase
    .from('goals')
    .select('source_slug')
    .eq('user_id', user.id);

  const userSlugs = new Set<string>();
  for (const row of goalsRaw ?? []) {
    const slug = (row as { source_slug: string | null }).source_slug;
    if (slug && povExists(slug)) userSlugs.add(slug);
  }

  const sortedSlugs = Array.from(userSlugs).sort();

  const bySlug: Record<TierKey, string[]> = Object.fromEntries(
    TIER_ORDER.map((t) => [t, [] as string[]]),
  ) as Record<TierKey, string[]>;
  const ungrouped: string[] = [];

  for (const slug of sortedSlugs) {
    const tier = tierFor(slug);
    if (tier) bySlug[tier].push(slug);
    else ungrouped.push(slug);
  }

  if (sortedSlugs.length === 0) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-12">
        <h1 className="text-3xl font-semibold tracking-tight">Your POVs</h1>
        <p className="mt-4 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
          You haven&rsquo;t accepted any goals yet, so there are no POVs to
          show here. The POV docs are the backing material for individual
          goals — pick a few from the library and their docs will show up
          here as reference.
        </p>
        <div className="mt-6">
          <Link
            href="/goals/library"
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
          >
            Browse the library
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="text-3xl font-semibold tracking-tight">Your POVs</h1>
      <p className="mt-3 max-w-xl text-sm text-zinc-600 dark:text-zinc-400">
        The docs backing your goals. Tap any title to read the full POV.
        Grouped by priority tier so the foundational ones read first.
      </p>

      <div className="mt-10 flex flex-col gap-8">
        {TIER_ORDER.map((tier) => {
          const items = bySlug[tier];
          if (items.length === 0) return null;
          return (
            <section key={tier}>
              <div className="mb-4 flex items-baseline gap-3 border-b border-zinc-200 pb-2 dark:border-zinc-800">
                <h2 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
                  {TIER_LABELS[tier]}
                </h2>
                <span className="text-xs text-zinc-500">{items.length}</span>
              </div>
              <ul className="flex flex-col gap-3">
                {items.map((slug) => {
                  const title = povTitleFor(slug);
                  const summary = plainLanguageFor(slug);
                  return (
                    <li key={slug}>
                      <Link
                        href={`/povs/${slug}`}
                        className="block rounded-lg border border-zinc-200 bg-white p-4 transition hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700 dark:hover:bg-zinc-800/50"
                      >
                        <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                          {title}
                        </div>
                        {summary && (
                          <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                            {summary}
                          </p>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}

        {ungrouped.length > 0 && (
          <section>
            <div className="mb-4 flex items-baseline gap-3 border-b border-zinc-200 pb-2 dark:border-zinc-800">
              <h2 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
                Other
              </h2>
              <span className="text-xs text-zinc-500">{ungrouped.length}</span>
            </div>
            <ul className="flex flex-col gap-3">
              {ungrouped.map((slug) => (
                <li key={slug}>
                  <Link
                    href={`/povs/${slug}`}
                    className="block rounded-lg border border-zinc-200 bg-white p-4 hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700 dark:hover:bg-zinc-800/50"
                  >
                    <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                      {povTitleFor(slug)}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </main>
  );
}
