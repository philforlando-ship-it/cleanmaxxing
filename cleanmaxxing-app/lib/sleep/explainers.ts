// "Why this commitment?" explainers for the daily-commitments list on
// /plan/sleep. Pure helper — takes a commitment source_key and
// returns a short list of bullet lines naming which blocker the user
// flagged + why this specific commitment is the response.
//
// Mirrors the rule set in lib/sleep/commitments.ts (RULES). Keep in
// sync — when a new commitment rule lands there, add the matching
// explainer here.
//
// Voice: dry, math-grounded, no moralizing. Show the work.

const COMMITMENT_EXPLAINERS: Record<string, string[]> = {
  screens_late: [
    'You flagged "screens late" as a blocker on the assessment.',
    'Blue-spectrum light + cognitive engagement before bed delays melatonin onset by 30-90 minutes for most people.',
    'The 30-minute window is the cheapest intervention with the largest evidence base. Tighter cutoffs (60-90 min) help more but cost more behaviorally.',
  ],
  caffeine_late: [
    'You flagged "caffeine late" as a blocker on the assessment.',
    'Caffeine half-life is 5-6 hours; an afternoon coffee still has measurable adenosine-blocking effect at 11pm.',
    'Noon is a conservative cutoff that fits most US/EU schedules. If you sleep before 10pm, pull it earlier; if you sleep after midnight, you have more headroom.',
  ],
  evening_alcohol: [
    'You flagged "evening alcohol" as a blocker on the assessment.',
    'Alcohol fragments REM sleep and elevates HR through the night even when it helps you fall asleep.',
    'Weeknight-only is the realistic ask. A drink at a Saturday dinner is not the failure mode worth optimizing against; nightly use is.',
  ],
  late_exercise: [
    'You flagged "late exercise" as a blocker on the assessment.',
    'Hard sessions elevate core temperature + cortisol for 2-3 hours; both run counter to sleep onset.',
    'The 2-hour buffer is the threshold most studies converge on. Zone 2 cardio is more forgiving than heavy lifting or HIIT.',
  ],
  wind_down: [
    'You flagged "racing thoughts" as a blocker AND have not tried mindfulness/breathing.',
    'A short structured wind-down displaces the rumination loop with a low-cognitive task.',
    'Writing tomorrow\'s three things specifically offloads the "I might forget" anxiety that keeps the rumination engine running.',
  ],
  environment_temp: [
    'You flagged "environment" as a blocker on the assessment.',
    'Core temperature has to drop ~1°F for sleep onset. A bedroom much above 68°F fights that drop directly.',
    '65-68°F is the standard sleep-research range; the exact set point is personal but the direction (cooler) is universal.',
  ],
  log_sleep: [
    'No specific blockers fired strong enough to drive a behavior change yet.',
    'The anchor commitment is just to log — without data, there\'s nothing to tune against. Two weeks of nightly logging surfaces the actual pattern.',
    'Once the data\'s in, the assessment can re-fire with stronger signal and replace this with a real intervention.',
  ],
};

export function explainCommitment(sourceKey: string): string[] | null {
  return COMMITMENT_EXPLAINERS[sourceKey] ?? null;
}
