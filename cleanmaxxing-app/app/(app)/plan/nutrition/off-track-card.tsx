// Recovery card on /plan/nutrition. Renders when
// detectNutritionOffTrack fires — same detector that drives the
// Area 2 contextual prompt on /today. The /today prompt is the
// doorbell; this card is the room behind it: tactical restart
// content the prompt can't fit.
//
// Voice rule (carries from copyNutritionOffTrack and the H1/H2
// framing decision): no "you fell off," no streak-shaming, no
// moralizing. The card observes, names the common failure modes,
// and proposes the smallest next step.

import Link from 'next/link';
import type { NutritionOffTrackShape } from '@/lib/contextual-prompt/prompts';

type Props = {
  shape: NutritionOffTrackShape;
};

export function NutritionOffTrackCard({ shape }: Props) {
  return (
    <section className="mt-6 rounded-xl border border-amber-300 bg-amber-50 p-5 dark:border-amber-900 dark:bg-amber-950/30">
      <header>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-900 dark:text-amber-300">
          Reset, not restart
        </p>
        <h2 className="mt-1 text-lg font-medium text-amber-950 dark:text-amber-100">
          {shape === 'silence'
            ? 'The log went quiet — that’s usually a signal, not a failure.'
            : 'A run of misses usually means the plan needs a tweak, not more discipline.'}
        </h2>
      </header>

      <p className="mt-3 text-[14px] leading-relaxed text-amber-900 dark:text-amber-200">
        {shape === 'silence' ? (
          <>
            Most users hit a quiet stretch in the first few months — holidays,
            stress, travel, an injury, a project deadline. The trend over 90
            days is what moves the needle, not any one week. The goal here
            isn&rsquo;t to compensate. It&rsquo;s to resume.
          </>
        ) : (
          <>
            When the hit ratio drops over a week, the cause is usually
            structural, not motivational. The protein source doesn&rsquo;t
            match the schedule, the prep window collapsed, or a hidden
            constraint shifted — travel, a new shift, the kitchen
            isn&rsquo;t accessible the way it was. Pushing harder on the
            same plan extends the slump.
          </>
        )}
      </p>

      <div className="mt-5">
        <p className="text-[12px] font-semibold uppercase tracking-wider text-amber-900 dark:text-amber-300">
          The restart, in order
        </p>
        <ol className="mt-2 space-y-2.5 text-[14px] leading-relaxed text-amber-900 dark:text-amber-200">
          <li>
            <span className="font-medium text-amber-950 dark:text-amber-100">
              Don&rsquo;t compensate.
            </span>{' '}
            The instinct after a stretch off plan is to swing into an
            aggressive deficit or skip meals to &ldquo;catch up.&rdquo; The
            math doesn&rsquo;t work that way and the rebound makes the next
            stretch worse. Resume the floor, no extra credit.
          </li>
          <li>
            <span className="font-medium text-amber-950 dark:text-amber-100">
              Log today.
            </span>{' '}
            One tap. The point isn&rsquo;t the data — it&rsquo;s
            re-establishing the loop. Skip the &ldquo;I&rsquo;ll start
            fresh Monday&rdquo; framing; the next clean window is the
            next meal.
          </li>
          <li>
            <span className="font-medium text-amber-950 dark:text-amber-100">
              Name one constraint that shifted.
            </span>{' '}
            Travel, a deadline, a new shift, sleep collapsed, a
            relationship event, an injury. Knowing which one tells you
            whether the plan needs a tweak (yes, often) or whether the
            current plan still applies once the disruption ends.
          </li>
          <li>
            <span className="font-medium text-amber-950 dark:text-amber-100">
              Change one thing, not the whole plan.
            </span>{' '}
            The temptation is to throw out the plan and start over with a
            different one. That&rsquo;s the cycle that produces five
            half-finished plans. Keep what was working, change the one
            piece that broke.
          </li>
        </ol>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Link
          href="/today"
          className="rounded-lg bg-amber-900 px-4 py-2 text-[13px] font-medium text-amber-50 hover:bg-amber-950 dark:bg-amber-200 dark:text-amber-950 dark:hover:bg-amber-100"
        >
          Log today
        </Link>
        <Link
          href="/povs/59-off-track-recovery"
          className="text-[13px] text-amber-900 underline decoration-dotted underline-offset-2 hover:text-amber-950 dark:text-amber-200 dark:hover:text-amber-100"
        >
          Read: why the 90-day trend matters more than the week
        </Link>
      </div>
    </section>
  );
}
