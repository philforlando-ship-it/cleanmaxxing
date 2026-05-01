import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { listPovSlugs } from '@/lib/content/pov';
import { LibraryBrowser } from './library-browser';
import { CustomGoalForm, type PovChoice } from './custom-goal-form';

// Tiers a custom goal can't anchor to. The custom-goal flow lets
// users pick a "closest POV" so Mister P has a retrieval anchor;
// these tiers are reference/safety material, not goal targets,
// so they're filtered out of the picker.
const ANCHOR_BLACKLIST = new Set(['meta', 'monitor', 'avoid']);

export default async function LibraryPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const availableSlugs = listPovSlugs();

  const { data: docsRaw } = await supabase
    .from('pov_docs')
    .select('slug, title, category, priority_tier');
  const povChoices: PovChoice[] = (docsRaw ?? [])
    .map((d) => d as { slug: string; title: string; category: string | null; priority_tier: string | null })
    .filter(
      (d) =>
        d.category !== null &&
        d.priority_tier !== null &&
        !ANCHOR_BLACKLIST.has(d.priority_tier),
    )
    .map((d) => ({
      slug: d.slug,
      title: d.title,
      category: d.category as string,
    }));

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="text-3xl font-semibold tracking-tight">Goal library</h1>
      <p className="mt-3 max-w-xl text-sm text-zinc-600 dark:text-zinc-400">
        Build from the bottom up. Foundation first, then high impact, then
        refinement. Polish is last &mdash; easy to over-invest in before the
        real work is done. Tap any tier label to see what it means.
      </p>
      <CustomGoalForm povs={povChoices} />
      <LibraryBrowser availableSlugs={availableSlugs} />
    </main>
  );
}
