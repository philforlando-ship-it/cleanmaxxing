'use client';

// Pinned "today's one thing" hero at the top of /today. The CTA
// scrolls to the underlying card (anchorId) — the hero is a
// pointer, not a duplicate logger. The full waterfall continues
// below; the hero just answers "what should I open first?" so a
// returning user on day 23 has a primary action above the noise.
//
// Optional milestone ribbon sits above the title. Optional soft-
// continuity line ("18 of the last 30 days") sits below. Both are
// quiet — the brand explicitly rejects daily self-rating shame, so
// the continuity line is shown without comparison, exhortation, or
// streak language. It exists to give a *felt sense* of consistency
// to the user who has it, and the user who fell off two weeks ago
// still sees an honest number that doesn't moralize.

import type { HeroSurface } from '@/lib/today/hero';

type Props = {
  hero: HeroSurface;
  // Day-X / first-X ribbon. Sits above the title in a quiet bar.
  // Null when no milestone fires today.
  milestoneText: string | null;
  // Continuity stat: { showedUp, total }. Null when the user is
  // inside the first 7 days (eligibility threshold) — the line
  // is suppressed entirely until the ratio is meaningful.
  continuity: { showedUp: number; total: number } | null;
};

export function TodayHeroCard({ hero, milestoneText, continuity }: Props) {
  function onCta() {
    if (typeof document === 'undefined') return;
    const el = document.getElementById(hero.anchorId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  return (
    <section className="rounded-xl border border-zinc-300 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
      {milestoneText && (
        <div className="-mx-6 -mt-6 mb-5 rounded-t-xl border-b border-zinc-200 bg-zinc-50 px-6 py-2 text-xs font-medium text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-300">
          {milestoneText}
        </div>
      )}

      <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
        Today
      </div>
      <h2 className="mt-1 text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
        {hero.title}
      </h2>
      {hero.sub && (
        <p className="mt-1.5 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          {hero.sub}
        </p>
      )}

      <div className="mt-4">
        <button
          type="button"
          onClick={onCta}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {hero.ctaLabel} ↓
        </button>
      </div>

      {continuity && (
        <p className="mt-4 border-t border-zinc-200 pt-3 text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
          You&rsquo;ve shown up{' '}
          <span className="font-medium text-zinc-700 dark:text-zinc-300">
            {continuity.showedUp} of the last {continuity.total} days
          </span>
          .
        </p>
      )}
    </section>
  );
}
