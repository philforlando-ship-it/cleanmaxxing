// Always-visible body-axes panel — surfaces the v2 granular-dimension
// principles (proportion + tailoring + color) above Stage 1 so the user
// has the rules in front of them while shopping the foundation pieces,
// not only after acquiring all five.
//
// The principle text is the single source of truth in
// lib/style/fit-calibration-content.ts (LEG_LENGTH_PRINCIPLES,
// ARM_LENGTH_PRINCIPLES, SKIN_UNDERTONE_PRINCIPLES); Stage 3 also
// includes the same principles in its full list once the user gets
// there. Surfacing here is for timing — these are shopping rules, the
// user benefits from them during the buy.
//
// Pre-migration assessments (all five v2 fields null) → panel renders
// nothing. The frame-based principles still appear in Stage 3 the same
// way they always did.

import {
  ARM_LENGTH_PRINCIPLES,
  LEG_LENGTH_PRINCIPLES,
  SKIN_UNDERTONE_PRINCIPLES,
} from '@/lib/style/fit-calibration-content';
import type {
  ArmLength,
  LegLength,
  SkinUndertone,
} from '@/lib/style/types';

type Props = {
  legLength: LegLength | null;
  armLength: ArmLength | null;
  skinUndertone: SkinUndertone | null;
};

export function BodyAxesPanel({ legLength, armLength, skinUndertone }: Props) {
  const principles = [];

  if (legLength === 'short' || legLength === 'long') {
    principles.push(LEG_LENGTH_PRINCIPLES[legLength]);
  }
  if (armLength === 'short' || armLength === 'long') {
    principles.push(ARM_LENGTH_PRINCIPLES[armLength]);
  }
  if (skinUndertone) {
    principles.push(SKIN_UNDERTONE_PRINCIPLES[skinUndertone]);
  }

  if (principles.length === 0) return null;

  return (
    <section className="mt-8 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
      <header className="mb-4 flex items-baseline justify-between">
        <h2 className="text-lg font-medium tracking-tight">
          Your body axes
        </h2>
        <span className="text-[11px] uppercase tracking-wider text-zinc-500">
          Apply at every purchase
        </span>
      </header>
      <p className="mb-5 text-[13px] leading-relaxed text-zinc-600 dark:text-zinc-400">
        These rules come from your assessment answers and apply to every
        clothing decision you make from here on — closet audit, foundation
        buy, future replacements. Keep them in mind while you shop.
      </p>
      <ul className="space-y-5">
        {principles.map((p) => (
          <li key={p.slug}>
            <p className="text-[14px] font-semibold text-zinc-900 dark:text-zinc-100">
              {p.title}
            </p>
            <p className="mt-1 text-[13px] leading-relaxed text-zinc-700 dark:text-zinc-300">
              {p.body}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
