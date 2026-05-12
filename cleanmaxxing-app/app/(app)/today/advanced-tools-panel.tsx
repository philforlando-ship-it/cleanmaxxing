// "Advanced tools" panel on /today (shipped 2026-05-12 alongside the
// hard Pro gate on the four advanced-tools plan pages). Sits below
// JourneysGrid as the discovery surface for /plan/trt, /plan/glp1,
// /plan/peptides, /plan/procedures.
//
// Visible to all logged-in users — the Pro gate enforces at the page
// itself, not here. Free users see a single "Pro" badge in the header
// so the upgrade expectation is set before they tap. Pro users see the
// same panel without the badge.
//
// Quieter visual weight than the JourneysGrid (smaller padding,
// no big icons) because these are advanced-tools, not the main
// 10-journey roster. Compact 2x2 grid keeps the page from
// re-bloating after Slice 3 dropped the redundancy.

import Link from 'next/link';

type Tile = {
  href: string;
  title: string;
  blurb: string;
};

const TILES: ReadonlyArray<Tile> = [
  {
    href: '/plan/trt',
    title: 'TRT',
    blurb: 'Testosterone replacement — eligibility, candidacy, protocol tracking.',
  },
  {
    href: '/plan/glp1',
    title: 'GLP-1',
    blurb: 'Semaglutide / tirzepatide — dose, weight curve, protein floor.',
  },
  {
    href: '/plan/peptides',
    title: 'Peptides',
    blurb: 'GH secretagogues — sermorelin, CJC-1295 + ipamorelin, tesamorelin.',
  },
  {
    href: '/plan/procedures',
    title: 'Procedures',
    blurb: 'Cosmetic procedures + a personalized procedural-fit check.',
  },
];

type Props = {
  isPremium: boolean;
};

export function AdvancedToolsPanel({ isPremium }: Props) {
  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <header className="flex items-baseline justify-between gap-3">
        <div>
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
            Advanced tools
          </h2>
          <p className="mt-1 text-[13px] leading-snug text-zinc-600 dark:text-zinc-400">
            Pharma + procedures, outside the focus-area roster.
          </p>
        </div>
        {!isPremium && (
          <span className="shrink-0 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/50 dark:text-amber-200">
            Pro
          </span>
        )}
      </header>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {TILES.map((tile) => (
          <Link
            key={tile.href}
            href={tile.href}
            className="group flex flex-col gap-1 rounded-xl border border-zinc-200 bg-zinc-50/50 px-4 py-3 transition-colors hover:border-zinc-300 hover:bg-white dark:border-zinc-800 dark:bg-zinc-950/40 dark:hover:border-zinc-700 dark:hover:bg-zinc-900"
          >
            <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
              {tile.title}
            </span>
            <span className="text-[12px] leading-snug text-zinc-600 dark:text-zinc-400">
              {tile.blurb}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
