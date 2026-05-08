// Per-blocker tailored guidance — single source of truth shared by
// the /today contextual prompt (lib/contextual-prompt/copy.ts) and
// the /plan/sleep deficit diagnostic card. POV 42 framing: cheap
// experiments first, name what's structural separately from what's
// hygiene-fixable.
//
// Don't add a blocker here without first extending SleepBiggestBlocker
// in lib/sleep/types.ts and the matching check constraint in the
// migration that owns the column.

import type { SleepBiggestBlocker } from './types';

export const BLOCKER_HINT: Record<SleepBiggestBlocker, string> = {
  screens_late:
    'Phone in another room from 30 minutes before bed is the cheapest experiment.',
  caffeine_late:
    "Caffeine half-life is 6+ hours — anything after lunch shows up at midnight.",
  evening_alcohol:
    "Alcohol fragments REM even when you fall asleep faster — that's the hidden cost.",
  late_exercise:
    'Heavy training inside three hours of bed runs cortisol high — shift it earlier or go lighter on those days.',
  racing_thoughts:
    'A 5-minute brain dump on paper before bed offloads what the bedroom thinking will otherwise cycle on.',
  environment:
    'Cool, dark, quiet — fix one of the three this week. Blackout, white noise, or a degree colder.',
  partner_or_kids:
    "Some of this is structural, not sleep-hygiene — name what's in your control vs. what isn't.",
  nothing_obvious:
    "When the cause isn't obvious, the answer is usually consistency. Same wake time on weekends is the strongest single lever.",
};

export const BLOCKER_LABEL: Record<SleepBiggestBlocker, string> = {
  screens_late: 'Late-night screens',
  caffeine_late: 'Late-day caffeine',
  evening_alcohol: 'Evening alcohol',
  late_exercise: 'Late-evening exercise',
  racing_thoughts: 'Racing thoughts at bedtime',
  environment: 'Bedroom environment',
  partner_or_kids: 'Partner or kids waking you',
  nothing_obvious: "Nothing obvious — can't pin it down",
};
