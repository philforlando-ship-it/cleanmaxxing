// Always-visible asymmetry programming panel — surfaces the
// unilateral-bias rules from POV 19's asymmetric-development section
// when the user reported a noticeable left/right strength or size
// difference (asymmetry_concern = 'noticeable' from the assessment).
//
// Same pattern as BodyAxesPanel on /plan/style — captures the AI
// report's rules into a persistent surface so the user sees the
// programming recipe whenever they revisit the strength plan, not
// only embedded in the one-time generated report.
//
// Renders nothing for 'none' / 'mild' / null — the report-prompt's
// rule is identical (no surfacing on those values, since 'mild' is
// handled by normal unilateral work and 'none' needs no special
// programming).

import type { StrengthAsymmetryConcern } from '@/lib/strength/types';

type Props = {
  asymmetryConcern: StrengthAsymmetryConcern | null;
};

export function AsymmetryProgrammingPanel({ asymmetryConcern }: Props) {
  if (asymmetryConcern !== 'noticeable') return null;

  return (
    <section className="mt-8 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
      <header className="mb-4 flex items-baseline justify-between">
        <h2 className="text-lg font-medium tracking-tight">
          Asymmetry programming
        </h2>
        <span className="text-[11px] uppercase tracking-wider text-zinc-500">
          Apply across every session
        </span>
      </header>
      <p className="mb-5 text-[13px] leading-relaxed text-zinc-600 dark:text-zinc-400">
        You reported a noticeable left/right difference. The standard
        programming above stays — these three rules layer on top of
        every session that includes a unilateral movement.
      </p>
      <ul className="space-y-5">
        <li>
          <p className="text-[14px] font-semibold text-zinc-900 dark:text-zinc-100">
            Lead with the weaker side
          </p>
          <p className="mt-1 text-[13px] leading-relaxed text-zinc-700 dark:text-zinc-300">
            On every unilateral exercise (single-arm DB press, split
            squat, single-leg RDL, pistol squat), do the weaker side
            first while you&rsquo;re fresh. The strong side then matches
            the rep count of the weak side — even if it could do more.
            This is the highest-leverage rule and it&rsquo;s
            counter-intuitive enough that most lifters skip it.
          </p>
        </li>
        <li>
          <p className="text-[14px] font-semibold text-zinc-900 dark:text-zinc-100">
            Add 1–2 weekly sets on the weaker side
          </p>
          <p className="mt-1 text-[13px] leading-relaxed text-zinc-700 dark:text-zinc-300">
            On top of the matched rep count above, add an extra set or
            two per week on the weak side only. Slow accumulator
            volume — not heavy load — is what closes the gap.
          </p>
        </li>
        <li>
          <p className="text-[14px] font-semibold text-zinc-900 dark:text-zinc-100">
            Track the gap closing — 6 to 12 month timeline
          </p>
          <p className="mt-1 text-[13px] leading-relaxed text-zinc-700 dark:text-zinc-300">
            Re-test every 8 to 12 weeks: single-arm DB press max reps at
            a fixed weight, single-leg balance time, grip strength left
            vs right. Visible asymmetry usually closes meaningfully in
            6–12 months of consistent unilateral work; if it&rsquo;s
            stuck after 6 months despite adherence, the cause is likely
            structural (old injury, scoliosis) rather than training,
            and a movement screen with a PT or qualified coach is the
            next move.
          </p>
        </li>
      </ul>
    </section>
  );
}
