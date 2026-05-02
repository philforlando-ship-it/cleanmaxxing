// Cleanmaxxing pyramid. Custom in-app article (not markdown-driven
// like the others) because the visualization is the article — every
// other article in /other-info is prose, but this one needs a
// stacked-tier graphic to make its point.
//
// Reads top-to-bottom: most aggressive interventions at the apex,
// foundation at the base. The widths reinforce the priority — base
// tiers carry most of the weight, the apex is small on purpose.

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

type Tier = {
  name: string;
  caption: string;
  items: string[];
  // Width percentage of the pyramid band — decreases as you go up.
  width: number;
  bg: string; // tailwind bg class
  text: string; // tailwind text class
};

// Top → bottom. The highest-impact, lowest-risk work sits at the
// base; layers above only earn their place after the base is in.
const TIERS: Tier[] = [
  {
    name: 'Cosmetic procedures',
    caption: 'Last resort, after foundation has run for years.',
    items: ['Hair transplant', 'Veneers', 'Fillers (selective)', 'Laser resurfacing', 'Rhinoplasty'],
    width: 30,
    bg: 'bg-zinc-900 dark:bg-zinc-100',
    text: 'text-zinc-50 dark:text-zinc-900',
  },
  {
    name: 'Hormonal & peptides',
    caption: 'Under physician supervision only. Education first.',
    items: ['TRT (prescribed)', 'GLP-1s (Rx for indication)', 'Tesamorelin', 'BPC-157 trials'],
    width: 42,
    bg: 'bg-zinc-800 dark:bg-zinc-200',
    text: 'text-zinc-50 dark:text-zinc-900',
  },
  {
    name: 'Targeted treatments',
    caption: 'Prescribed or evidence-backed actives for specific issues.',
    items: ['Finasteride', 'Minoxidil', 'Tretinoin', 'Isotretinoin (severe acne)', 'BPO / salicylic acid'],
    width: 56,
    bg: 'bg-zinc-700 dark:bg-zinc-300',
    text: 'text-zinc-50 dark:text-zinc-900',
  },
  {
    name: 'Refinements',
    caption: 'Worth doing once the foundation is solid.',
    items: ['Creatine', 'Vitamin D / omega-3', 'Cardio base', 'Body hair', 'Eye-area routine', 'Fiber 30g/day', 'Mobility'],
    width: 70,
    bg: 'bg-zinc-300 dark:bg-zinc-700',
    text: 'text-zinc-900 dark:text-zinc-100',
  },
  {
    name: 'High impact',
    caption: 'Meaningful returns with moderate effort, once basics are in.',
    items: ['Grooming routine', 'Dental work', 'Wardrobe fit', 'Posture', 'Facial hair shape', 'Controlled tanning'],
    width: 84,
    bg: 'bg-zinc-200 dark:bg-zinc-800',
    text: 'text-zinc-900 dark:text-zinc-100',
  },
  {
    name: 'Foundation',
    caption: 'Highest leverage. Most of the real change is here.',
    items: ['Sleep schedule', 'Strength training', 'Daily macros + protein', 'Skincare routine', 'Hair care', 'Environment design'],
    width: 100,
    bg: 'bg-zinc-100 dark:bg-zinc-900',
    text: 'text-zinc-900 dark:text-zinc-100',
  },
];

const OFF_PYRAMID = [
  { name: 'Bonesmashing / mewing as orthodontics', why: 'No mechanism, real injury risk.' },
  { name: 'Synthol / site-enhancement oil', why: 'Not muscle. Cosmetic injury.' },
  { name: 'DNP, clenbuterol, thyroid for fat loss', why: 'No legitimate use case at any tier.' },
  { name: 'Underground SARMs / steroids without a doctor', why: 'Sourcing, dosing, and lab risk all uncontrolled.' },
  { name: 'Hairline tattoos abroad from unvetted providers', why: 'Permanent. The downside dominates.' },
  { name: 'Sub-1000 calorie sustained restriction', why: 'Not a cut. A disordered pattern.' },
];

export default async function PyramidPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <Link
        href="/other-info"
        className="text-xs text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
      >
        ← Other Info
      </Link>

      <article className="mt-6">
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-zinc-900 sm:text-5xl dark:text-zinc-100">
          The Cleanmaxxing pyramid
        </h1>

        <p className="mt-6 font-serif text-[17px] leading-relaxed text-zinc-800 dark:text-zinc-200">
          Almost every category mistake men make in self-improvement is the
          same mistake: starting from the top of the pyramid and working
          down. They reach for finasteride before their hair routine is
          consistent. They chase TRT before their sleep is dialed in. They
          book a transplant before the lifestyle that protects what&rsquo;s
          left has been in place for a year.
        </p>

        <p className="mt-5 font-serif text-[17px] leading-relaxed text-zinc-800 dark:text-zinc-200">
          The pyramid is the order of operations. Base first. Apex last, if
          ever. The width of each tier reflects how much of the actual
          result comes from that level — the foundation is wide because
          most of the visible change comes from there, and the apex is
          narrow because cosmetic procedures earn their place only after
          the base has done its job.
        </p>

        <h2 className="mt-16 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
          Read top to bottom
        </h2>

        <div className="mt-8 flex flex-col items-center gap-2">
          {TIERS.map((tier) => (
            <div
              key={tier.name}
              style={{ width: `${tier.width}%` }}
              className={`${tier.bg} ${tier.text} rounded-lg px-4 py-4 text-center transition`}
            >
              <div className="text-sm font-semibold uppercase tracking-wide">
                {tier.name}
              </div>
              <div className="mt-1 text-xs opacity-80">{tier.caption}</div>
              <div className="mt-3 flex flex-wrap justify-center gap-1.5 text-[11px]">
                {tier.items.map((item) => (
                  <span
                    key={item}
                    className="rounded-full bg-black/15 px-2 py-0.5 dark:bg-white/15"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        <h2 className="mt-16 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
          Why this order matters
        </h2>

        <p className="mt-5 font-serif text-[17px] leading-relaxed text-zinc-800 dark:text-zinc-200">
          Every tier above the foundation amplifies what the foundation is
          doing. Finasteride works better when you&rsquo;re sleeping seven
          hours; TRT works better when training is already in place;
          isotretinoin works better when the diet that&rsquo;s feeding the
          inflammation has been cleaned up. The reverse is rarely true —
          adding the apex to a missing base mostly produces side effects
          and a thinner wallet.
        </p>

        <p className="mt-5 font-serif text-[17px] leading-relaxed text-zinc-800 dark:text-zinc-200">
          The same logic explains why most men over 30 hit a wall doing
          pure-visual work. The visible improvements compound when the
          base is sustainable; without that base, the gains evaporate
          inside the year as the lifestyle that produced them collapses
          back to baseline.
        </p>

        <h2 className="mt-16 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
          Off the pyramid
        </h2>

        <p className="mt-5 font-serif text-[17px] leading-relaxed text-zinc-800 dark:text-zinc-200">
          A few things look like they belong on the pyramid and don&rsquo;t.
          Cleanmaxxing covers them as education — what they are, why
          people reach for them, what the actual risk is — but does not
          recommend them at any tier. They are not a higher level of
          aggression you graduate to; they are off the framework
          altogether.
        </p>

        <ul className="mt-6 flex flex-col gap-3">
          {OFF_PYRAMID.map((item) => (
            <li
              key={item.name}
              className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-900 dark:bg-amber-950/30"
            >
              <div className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                {item.name}
              </div>
              <div className="mt-1 text-xs text-amber-800 dark:text-amber-300">
                {item.why}
              </div>
            </li>
          ))}
        </ul>

        <h2 className="mt-16 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
          Where to start
        </h2>

        <p className="mt-5 font-serif text-[17px] leading-relaxed text-zinc-800 dark:text-zinc-200">
          If you can only do one thing this month: pick a single tile from
          the foundation row. Sleep schedule. Protein target. Three
          training sessions. The boring thing that runs every day.
          That&rsquo;s the layer everything else compounds on, and the one
          most men skip in their hurry to reach for the apex.
        </p>
      </article>
    </main>
  );
}
