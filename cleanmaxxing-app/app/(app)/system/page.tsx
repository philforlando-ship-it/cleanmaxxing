// /system — the framework view. Renders the looksmaxxing tier list
// from POV 15 with the user's active journeys highlighted within.
//
// G1 from the May 7 brain dump: "show the user the hierarchy/pyramid
// of what matters." The library page already groups goal templates by
// tier; this page goes one level up and shows the *system* itself —
// the framework that gives the tiers meaning. Useful for orientation
// after onboarding ("where am I in the bigger picture") and for users
// who want to see what they haven't yet considered.

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import {
  TIER_INFO,
  TIER_ORDER,
  FOCUS_AREA_TO_POV_SLUG,
  focusAreaForPovSlug,
  type TierKey,
} from '@/lib/hierarchy/tiers';

type PovRow = {
  slug: string;
  title: string;
  category: string | null;
  priority_tier: string | null;
};

const CATEGORY_LABEL: Record<string, string> = {
  'biological-foundation': 'Foundation',
  'structural-framing': 'Framing',
  'grooming-refinement': 'Grooming',
  'behavioral-aesthetics': 'Behavioral',
  'perception-identity': 'Perception',
};

function isTier(value: string | null): value is TierKey {
  return TIER_ORDER.includes(value as TierKey);
}

function cleanTitle(raw: string): string {
  let s = raw.replace(/^\d+\s*[-.]\s*/, '');
  if (/^[a-z][a-z0-9-]*$/.test(s)) {
    s = s
      .split('-')
      .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : ''))
      .join(' ');
  }
  return s;
}

export default async function SystemPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Fetch the user's active focus_areas. Stored on survey_responses
  // under question_key='focus_areas' — same source the primary-action
  // picker reads from.
  const { data: focusRow } = await supabase
    .from('survey_responses')
    .select('response_value')
    .eq('user_id', user.id)
    .eq('question_key', 'focus_areas')
    .maybeSingle();

  const rawFocus = (focusRow?.response_value as unknown) ?? null;
  const focusAreas: string[] = Array.isArray(rawFocus)
    ? (rawFocus as string[])
    : [];
  const focusSet = new Set(focusAreas);
  const activePovSlugs = new Set(
    focusAreas
      .map((fa) => FOCUS_AREA_TO_POV_SLUG[fa])
      .filter((slug): slug is string => Boolean(slug)),
  );

  const { data: docsRaw } = await supabase
    .from('pov_docs')
    .select('slug, title, category, priority_tier');
  const docs: PovRow[] = (docsRaw ?? []).map((d) => d as PovRow);

  // Group by tier; everything outside tier-1..5 (advanced/monitor/
  // avoid/conditional/meta) goes to a single "context" bucket the
  // page renders below the main hierarchy.
  const byTier: Record<TierKey, PovRow[]> = {
    'tier-1': [],
    'tier-2': [],
    'tier-3': [],
    'tier-4': [],
    'tier-5': [],
  };
  for (const d of docs) {
    if (isTier(d.priority_tier)) byTier[d.priority_tier].push(d);
  }
  for (const tier of TIER_ORDER) {
    byTier[tier].sort((a, b) => cleanTitle(a.title).localeCompare(cleanTitle(b.title)));
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-3xl font-semibold tracking-tight">The system</h1>
      <p className="mt-3 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
        The honest hierarchy of what actually changes how you look — biggest
        levers first. Your active focus areas are highlighted in each tier so
        you can see where your work lives in the bigger picture, and what
        you haven&rsquo;t touched yet.{' '}
        <Link
          href="/povs/15-looksmaxxing-system"
          className="underline decoration-dotted underline-offset-2 hover:text-zinc-900 dark:hover:text-zinc-100"
        >
          Read the full framing →
        </Link>
      </p>

      {focusAreas.length > 0 && (
        <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
          Active focus areas: {focusAreas.join(', ').replace(/_/g, ' ')}
        </p>
      )}

      <div className="mt-10 flex flex-col gap-10">
        {TIER_ORDER.map((tier) => {
          const info = TIER_INFO[tier];
          const items = byTier[tier];
          const activeCount = items.filter((d) =>
            activePovSlugs.has(d.slug),
          ).length;

          return (
            <section key={tier}>
              {/* Tier header — visual weight intentionally light so
                  journey-anchored items below dominate visually
                  (per May 8 design call: journey > tier emphasis). */}
              <div className="flex items-baseline justify-between gap-3 border-b border-zinc-200 pb-2 dark:border-zinc-800">
                <div className="flex items-baseline gap-3">
                  <h2 className="text-base font-semibold tracking-tight text-zinc-700 dark:text-zinc-300">
                    {info.shortLabel}
                  </h2>
                  <span className="text-xs text-zinc-500 dark:text-zinc-500">
                    {info.longLabel}
                  </span>
                </div>
                <span className="text-xs text-zinc-500 dark:text-zinc-500">
                  {activeCount > 0
                    ? `${activeCount} active · ${items.length} total`
                    : `${items.length} topics`}
                </span>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                {info.description}
              </p>
              <ul className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {items.map((d) => {
                  const isActive = activePovSlugs.has(d.slug);
                  const fa = focusAreaForPovSlug(d.slug);
                  // A POV is journey-anchored if the focus_area for it
                  // exists in the focus area roster — every entry in
                  // FOCUS_AREA_TO_POV_SLUG qualifies regardless of
                  // whether the user picked it.
                  const isJourneyAnchored = fa !== null;
                  // Three visual tiers:
                  //   1. isActive (journey-anchored AND user picked it):
                  //      strongest treatment — emerald fill + accent
                  //      bar + "Your journey" badge.
                  //   2. isJourneyAnchored (journey available, not
                  //      picked): mid treatment — bold left bar + raised
                  //      surface so the available-journey signal still
                  //      dominates non-journey POVs.
                  //   3. Plain POV: muted card.
                  const itemClass = isActive
                    ? 'border-l-4 border-l-emerald-500 border-y border-r border-emerald-300 bg-emerald-50 shadow-sm dark:border-emerald-700 dark:border-l-emerald-500 dark:bg-emerald-950/40'
                    : isJourneyAnchored
                      ? 'border-l-4 border-l-zinc-900 border-y border-r border-zinc-200 bg-white shadow-sm dark:border-zinc-700 dark:border-l-zinc-100 dark:bg-zinc-900'
                      : 'border border-zinc-200 bg-zinc-50/40 dark:border-zinc-800 dark:bg-zinc-900/30';
                  return (
                    <li
                      key={d.slug}
                      className={`rounded-lg p-3 transition ${itemClass}`}
                    >
                      <div className="flex items-baseline justify-between gap-2">
                        <Link
                          href={`/povs/${d.slug}`}
                          className={`text-sm hover:underline dark:text-zinc-100 ${
                            isJourneyAnchored
                              ? 'font-semibold text-zinc-900'
                              : 'font-medium text-zinc-700 dark:text-zinc-300'
                          }`}
                        >
                          {cleanTitle(d.title)}
                        </Link>
                        {isActive && (
                          <span className="shrink-0 rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-semibold text-white">
                            Your journey
                          </span>
                        )}
                        {!isActive && isJourneyAnchored && (
                          <span className="shrink-0 rounded-full bg-zinc-900 px-2 py-0.5 text-[10px] font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900">
                            Journey
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                        {d.category && CATEGORY_LABEL[d.category]
                          ? CATEGORY_LABEL[d.category]
                          : d.category}
                        {isJourneyAnchored &&
                          !isActive &&
                          fa &&
                          !focusSet.has(fa) &&
                          ' · available to start'}
                      </p>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>

      <div className="mt-12 rounded-lg border border-zinc-200 bg-zinc-50 p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
          The hierarchy is descriptive, not prescriptive. You don&rsquo;t need
          to finish Tier 1 before touching Tier 2 — but stacking Tier 4 work
          on top of an unfinished Tier 1 (sleep, body comp, skin) usually
          delivers worse results than the same effort spent on the floor
          underneath. Use this map to spot where you&rsquo;re overspending
          attention and where you&rsquo;ve gone quiet.
        </p>
      </div>
    </main>
  );
}
