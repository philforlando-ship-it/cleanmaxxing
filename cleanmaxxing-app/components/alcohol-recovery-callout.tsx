// Static inline callout shown above the strength + cardio reports
// when the user's nutrition.alcohol_use is 'moderate' or 'heavy'.
// Surfaces the same posture the LLM prompts already enforce — the
// recovery cost is named honestly, no moralizing — so the user sees
// the framing inline instead of having to dig through the markdown.
//
// Render-conditioned by the page (returns null for none / occasional /
// missing). Voice posture is dry math, not lecture.

import type { AlcoholUse } from '@/lib/nutrition/types';

type Props = {
  alcohol_use: AlcoholUse | null;
  // 'strength' or 'cardio' — adjusts the recovery framing per surface
  // (strength names per-session scheduling + progressive overload;
  // cardio names Zone 2 paces + HIIT difficulty).
  surface: 'strength' | 'cardio';
};

export function AlcoholRecoveryCallout({ alcohol_use, surface }: Props) {
  if (alcohol_use !== 'moderate' && alcohol_use !== 'heavy') return null;

  const isHeavy = alcohol_use === 'heavy';
  const surfaceCopy = surface === 'strength' ? STRENGTH_COPY : CARDIO_COPY;
  const body = isHeavy ? surfaceCopy.heavy : surfaceCopy.moderate;

  return (
    <aside className="mt-6 rounded-md border border-zinc-300 bg-zinc-50 px-4 py-3 dark:border-zinc-700 dark:bg-zinc-900/60">
      <p className="text-[12px] font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
        Alcohol &amp; recovery
      </p>
      <p className="mt-1 text-[13px] leading-relaxed text-zinc-700 dark:text-zinc-300">
        {body}
      </p>
    </aside>
  );
}

const STRENGTH_COPY = {
  moderate:
    "You're at moderate alcohol use (3–7 drinks/week). If a drinking night is on the calendar, your hardest session of that week probably shouldn't be the next morning — push it 24–48 hours. The plan otherwise assumes baseline recovery; this is the one schedule note worth keeping in mind.",
  heavy:
    "You're at heavy alcohol use (8+/week). The plan assumes you're recovering fully between sessions; at your current alcohol use that assumption may not hold. Expect progressive overload to run ~10–15% slower than the prescription suggests until that shifts. Math, not judgment — same plan, just calibrated honestly to where you are.",
};

const CARDIO_COPY = {
  moderate:
    "You're at moderate alcohol use (3–7 drinks/week). Schedule Zone 2 sessions for 36+ hours after a drinking night, not the morning after — your aerobic numbers will read better and the session won't feel like a drag.",
  heavy:
    "You're at heavy alcohol use (8+/week). The cardio prescription assumes baseline recovery between sessions. At your current alcohol use, expect Zone 2 paces to drift slower than your fitness suggests, and HIIT to feel disproportionately hard. Math, not judgment — same prescription, just calibrated.",
};
