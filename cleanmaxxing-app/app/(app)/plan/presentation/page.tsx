// /plan/presentation — curated content hub branded as a journey.
//
// Intentionally minimal: no assessment form, no stages, no Pattern D,
// no wearable signals, no cross-journey modifiers, no DB writes.
// Daily practice prompts (static) + cross-links into existing POVs
// (50 posture, 14 presence-intangibles, 56 identity-beyond-appearance).
//
// Not added to lib/today/journeys.ts JOURNEYS catalog or the onboarding
// focus_areas picker yet — discoverable via direct URL and Mister P
// recommendation. Promote to the journey catalog only if retention
// signal warrants it; for now the lightest-possible scope.
//
// Voice posture reminder: presentation work isn't appearance-correction.
// The page copy stays grounded in "additive carriage / signal clarity"
// framing, not "fix yourself" framing — same posture as POVs 14 + 56.

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

type DailyPrompt = {
  title: string;
  body: string;
};

const DAILY_PROMPTS: ReadonlyArray<DailyPrompt> = [
  {
    title: 'Posture reset',
    body: 'Stand against a wall — heels, glutes, shoulder blades, back of the head all touching. Hold for 30 seconds, then walk away keeping that line. The goal isn’t holding it forever, it’s resetting the default your spine drifts back to.',
  },
  {
    title: 'Vocal warmup',
    body: 'Read one paragraph aloud at a slower pace than feels natural — about 80% of your default speed. Most men’s voices run higher and faster than they need to under pressure. The practice gives you the range to choose where to sit.',
  },
  {
    title: 'Eye contact hold',
    body: 'In your next conversation, hold eye contact for a beat longer than feels comfortable before glancing away. Just one beat. It’s the most-noticed presence signal and the easiest to drift on under stress.',
  },
  {
    title: 'Breath before',
    body: 'Three slow nasal breaths before any meeting, call, or hard conversation. Lowers the pitch naturally, slows the speaking pace, and buys you a beat to choose words rather than react.',
  },
];

type PovLink = {
  slug: string;
  title: string;
  blurb: string;
};

const POV_LINKS: ReadonlyArray<PovLink> = [
  {
    slug: '50-posture',
    title: 'Posture',
    blurb:
      'What good posture costs (almost nothing) and what bad posture costs (people read you as anxious or sloppy without knowing why). The single highest-ROI presentation lever.',
  },
  {
    slug: '14-presence-intangibles',
    title: 'Presence intangibles',
    blurb:
      'Carriage, voice, eye contact, stillness — the traits that read in a room before competence does. Why presence is downstream of training, not personality.',
  },
  {
    slug: '56-identity-beyond-appearance',
    title: 'Identity beyond appearance',
    blurb:
      'The framing that keeps presentation work from collapsing into another source of anxiety. Worth reading once a quarter, especially after a hard week.',
  },
];

export default async function PresentationPlanPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <Link
        href="/today"
        className="text-xs text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
      >
        ← Back to Today
      </Link>

      <header className="mt-6">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
          Presentation
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-zinc-700 dark:text-zinc-300">
          How you carry yourself reads from across a room before
          anything else does — posture, vocal clarity, eye contact,
          stillness under pressure. Most of it is daily practice, not
          protocol. This is a curated hub: a few prompts you can do
          today and the reading that backs them. No assessment, no
          stages — the work doesn&rsquo;t fit that shape.
        </p>
      </header>

      <section className="mt-10">
        <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
          Daily practice
        </h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Four short prompts. Do as many as fit your day; rotate the
          rest. Small reps, compounded.
        </p>
        <ul className="mt-4 space-y-3">
          {DAILY_PROMPTS.map((p) => (
            <li
              key={p.title}
              className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                {p.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
                {p.body}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
          The reading
        </h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Each POV is the same content Mister&nbsp;P retrieves when
          these topics come up in chat.
        </p>
        <ul className="mt-4 space-y-3">
          {POV_LINKS.map((p) => (
            <li key={p.slug}>
              <Link
                href={`/povs/${p.slug}`}
                className="block rounded-xl border border-zinc-200 bg-white p-5 transition-colors hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700 dark:hover:bg-zinc-800"
              >
                <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                  {p.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
                  {p.blurb}
                </p>
                <span className="mt-3 inline-block text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                  Read &rarr;
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-10 rounded-xl border border-zinc-200 bg-zinc-50 px-5 py-4 dark:border-zinc-800 dark:bg-zinc-950">
        <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
          No plan generation here. Presentation doesn&rsquo;t have the
          kind of measurable inputs the other journeys do — no wearable
          reads eye contact and no algorithm grades a posture reset.
          The work is daily practice plus reading. If you want a more
          personal angle, ask Mister&nbsp;P — chat reaches everything in
          the corpus.
        </p>
      </section>
    </main>
  );
}
