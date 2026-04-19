// POV library index. Lists all published POV docs grouped by tier,
// each linking to /povs/[slug]. Users can browse the full corpus
// independently of which goals they've accepted.

import Link from 'next/link';
import { listPovSlugs, povTitleFor } from '@/lib/content/pov';
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

export default function PovsIndexPage() {
  const slugs = listPovSlugs();

  const bySlug: Record<TierKey, string[]> = Object.fromEntries(
    TIER_ORDER.map((t) => [t, [] as string[]]),
  ) as Record<TierKey, string[]>;
  const ungrouped: string[] = [];

  for (const slug of slugs) {
    const tier = tierFor(slug);
    if (tier) bySlug[tier].push(slug);
    else ungrouped.push(slug);
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="text-3xl font-semibold tracking-tight">POV library</h1>
      <p className="mt-3 max-w-xl text-sm text-zinc-600 dark:text-zinc-400">
        The docs behind the goals. Tap any title to read the full POV. Foundation first,
        then high impact, then refinement — the same priority order the goal library uses.
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
