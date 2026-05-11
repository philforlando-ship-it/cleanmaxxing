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
  FOCUS_AREA_LABEL,
  FOCUS_AREA_TO_PLAN_PATH,
  FOCUS_AREA_TO_POV_SLUG,
  focusAreaForPovSlug,
  isJourneyAnchor,
  parentFocusAreaForPovSlug,
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

  // Fetch the user's active focus_areas + age. Age is needed to
  // resolve cardio's tier (promotes from tier-3 to tier-2 at 35+),
  // matching /today's tier-aware behavior so both surfaces tell the
  // same story.
  const [{ data: focusRow }, { data: userRow }] = await Promise.all([
    supabase
      .from('survey_responses')
      .select('response_value')
      .eq('user_id', user.id)
      .eq('question_key', 'focus_areas')
      .maybeSingle(),
    supabase
      .from('users')
      .select('age')
      .eq('id', user.id)
      .maybeSingle(),
  ]);
  const userAge = (userRow as { age: number | null } | null)?.age ?? null;

  const rawFocus = (focusRow?.response_value as unknown) ?? null;
  const focusAreas: string[] = Array.isArray(rawFocus)
    ? (rawFocus as string[])
    : [];
  const focusSet = new Set(focusAreas);
  const activePovSlugs = new Set(
    focusAreas
      .map((fa) =>
        (FOCUS_AREA_TO_POV_SLUG as Record<string, string | undefined>)[fa],
      )
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

  // Cardio promotes from tier-3 to tier-2 at age 35+. Mirrors the
  // age-aware tier resolution in lib/today/journeys.ts (tierForJourney)
  // so /today and /system tell the same story for the same user.
  // Reason: VO2max decline accelerates past 35; cardio's downstream
  // effects on sleep + stress + recovery + all-cause mortality become
  // more leverage. The static metadata in content/povs/_metadata.json
  // is the default for users under 35 / users without age on file.
  if (userAge !== null && userAge >= 35) {
    const cardioIdx = byTier['tier-3'].findIndex((d) => d.slug === '23-cardio');
    if (cardioIdx >= 0) {
      const [cardioRow] = byTier['tier-3'].splice(cardioIdx, 1);
      byTier['tier-2'].push(cardioRow);
    }
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
                  const isAnchor = isJourneyAnchor(d.slug);
                  // Parent journey for non-anchor POVs (e.g.
                  // 31-calorie-macro-framework → body_composition).
                  // Null for cross-cutting / meta / safety POVs that
                  // don't belong to a journey at all.
                  const anchorFa = focusAreaForPovSlug(d.slug);
                  const parentFa = parentFocusAreaForPovSlug(d.slug);
                  const isChapterOfJourney = !isAnchor && parentFa !== null;
                  const journeyFa = anchorFa ?? parentFa;
                  // Where the title links. Anchors and chapters route
                  // to the journey's plan surface (where the user
                  // actually does the work). Orphan POVs fall back to
                  // the standalone reader.
                  const titleHref = journeyFa
                    ? FOCUS_AREA_TO_PLAN_PATH[journeyFa]
                    : `/povs/${d.slug}`;
                  // Four visual tiers:
                  //   1. isActive (anchor + user picked it): strongest —
                  //      emerald fill + accent bar + "Your journey".
                  //   2. isAnchor (journey, not picked): mid — bold
                  //      left bar + raised surface.
                  //   3. isChapterOfJourney (chapter of someone's
                  //      journey): subtle left bar (zinc-400) + plain
                  //      bg + "Part of: <Journey>" chip.
                  //   4. Plain POV (no journey home): muted card.
                  const itemClass = isActive
                    ? 'border-l-4 border-l-emerald-500 border-y border-r border-emerald-300 bg-emerald-50 shadow-sm dark:border-emerald-700 dark:border-l-emerald-500 dark:bg-emerald-950/40'
                    : isAnchor
                      ? 'border-l-4 border-l-zinc-900 border-y border-r border-zinc-200 bg-white shadow-sm dark:border-zinc-700 dark:border-l-zinc-100 dark:bg-zinc-900'
                      : isChapterOfJourney
                        ? 'border-l-2 border-l-zinc-400 border-y border-r border-zinc-200 bg-white dark:border-zinc-800 dark:border-l-zinc-600 dark:bg-zinc-900'
                        : 'border border-zinc-200 bg-zinc-50/40 dark:border-zinc-800 dark:bg-zinc-900/30';
                  return (
                    <li
                      key={d.slug}
                      className={`rounded-lg p-3 transition ${itemClass}`}
                    >
                      <div className="flex items-baseline justify-between gap-2">
                        <Link
                          href={titleHref}
                          className={`text-sm hover:underline dark:text-zinc-100 ${
                            isAnchor
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
                        {!isActive && isAnchor && (
                          <span className="shrink-0 rounded-full bg-zinc-900 px-2 py-0.5 text-[10px] font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900">
                            Journey
                          </span>
                        )}
                        {isChapterOfJourney && parentFa && (
                          <span className="shrink-0 rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                            Part of: {FOCUS_AREA_LABEL[parentFa]}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                        {d.category && CATEGORY_LABEL[d.category]
                          ? CATEGORY_LABEL[d.category]
                          : d.category}
                        {isAnchor &&
                          !isActive &&
                          anchorFa &&
                          !focusSet.has(anchorFa) &&
                          ' · available to start'}
                        {isChapterOfJourney && (
                          <>
                            {' · '}
                            <Link
                              href={`/povs/${d.slug}`}
                              className="underline decoration-dotted underline-offset-2 hover:text-zinc-700 dark:hover:text-zinc-300"
                            >
                              read the POV
                            </Link>
                          </>
                        )}
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

      <p className="mt-8 text-sm text-zinc-600 dark:text-zinc-400">
        Want to go deeper on any of the topics above?{' '}
        <Link
          href="/other-info"
          className="underline decoration-dotted underline-offset-2 hover:text-zinc-900 dark:hover:text-zinc-100"
        >
          Browse the article library →
        </Link>
      </p>
    </main>
  );
}
