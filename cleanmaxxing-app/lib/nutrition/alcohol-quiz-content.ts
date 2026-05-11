// Alcohol & the day after — interactive engagement surface for
// /plan/nutrition. Each item is a real drinking scenario the user
// might face on a cut, recomp, or just a normal social week. The
// user calls smart / workable / costly; Mister P reveals the call
// + reasoning.
//
// Voice rules (carry from POV 24 alcohol-cannabis and the brand
// voice posture):
//   - No moralizing about drinking. The product is for adult men
//     who drink. Refusal to engage with that reality is the wrong
//     posture.
//   - No demonizing. The cost is named in mechanism terms — sleep
//     REM suppression, cortisol clearance, liquid-calorie density,
//     binge-cycle triggers — not in "you shouldn't."
//   - The two-drink threshold is named explicitly because it's the
//     actual physiologically-grounded line.
//
// Tier definitions:
//   smart      = efficient choice, low downstream cost
//   workable   = fine in moderation but not optimized — there's a
//                better version of this move
//   costly     = real downstream cost, often invisible at the time
//                (sleep / hormonal / binge-cycle)

export type AlcoholQuizTier = 'smart' | 'workable' | 'costly';

export type AlcoholQuizItem = {
  // Stable id for keying React lists.
  id: string;
  // Scenario headline — 1 line.
  scenario: string;
  // 1-line detail under the headline (context, what was done).
  context: string;
  tier: AlcoholQuizTier;
  // Mister P's reasoning. 2-4 sentences. Names the mechanism, not
  // a moral verdict.
  explanation: string;
};

// Ordered intentionally — open with smart-call wins to set the
// framework, walk into workable to show diminishing-returns nuance,
// land on the costly cases (compensation eating + nightly use) that
// users underweight most.
export const ALCOHOL_QUIZ_ITEMS: ReadonlyArray<AlcoholQuizItem> = [
  {
    id: 'vodka-soda-cut',
    scenario: 'On a 600 cal/day deficit. Going out and ordering 3 vodka sodas over 4 hours.',
    context:
      'Standard restaurant pour. Drinking water in between rounds. Not skipping dinner.',
    tier: 'smart',
    explanation:
      'Vodka soda is the most calorie-efficient mixed drink — roughly 100 cal per pour, zero added sugar. Three drinks over four hours is paced (~30g alcohol over the window), which keeps blood alcohol moderate and lets the liver work in real time rather than backing up. 300 cal from drinks lands well inside the math on a deficit this size. Hydrating between rounds further reduces next-day cost.',
  },
  {
    id: 'water-pacing',
    scenario: 'Dinner with two drinks planned. You alternate water and the cocktail.',
    context:
      'Drink, glass of water, drink, glass of water. Slows the pace and the consumption.',
    tier: 'smart',
    explanation:
      'Hydration pacing does three things at once — slows drinking pace (often the cap on total consumption), dilutes blood alcohol, and pre-loads next-day rehydration. The hangover cost of two drinks paced this way is meaningfully smaller than two drinks back-to-back, and you usually end up at two rather than three. Cheap move with no downside.',
  },
  {
    id: 'hangover-protein-recovery',
    scenario:
      'Hangover morning. You drink 24oz water + electrolytes + have a protein-forward breakfast.',
    context:
      'Eggs and a glass of milk, or a protein shake. Skipping the bacon-and-pancakes default.',
    tier: 'smart',
    explanation:
      'Rehydration + electrolytes is the load-bearing recovery move — most hangover symptoms are dehydration + electrolyte depletion compounding. Protein-forward breakfast stabilizes blood sugar (which alcohol crashes) and shuts down the appetite swings that drive next-day overeating. Skip the carb-and-grease breakfast — it spikes blood sugar harder and extends the cognitive fog.',
  },
  {
    id: 'two-ipas-dinner',
    scenario: 'On a cut. You order 2 IPAs (8% ABV) with dinner.',
    context:
      'Two regular pints at a brewery-style restaurant. Maybe a third "for the road."',
    tier: 'costly',
    explanation:
      'High-ABV IPAs run 250–300 calories each — two pints is 500–600 cal from drinks alone before dinner, and that\'s before the third. On a cut, that single dinner can erase three days of deficit. The same volume of vodka soda is 200 cal total. The IPAs aren\'t a moral failure; they\'re just calorie-inefficient. If beer is the move, pick a 4–5% lager and stop at two.',
  },
  {
    id: 'skinny-margarita',
    scenario: 'You order a "skinny margarita" thinking it\'s the clean choice.',
    context:
      'Tequila, lime, splash of orange liqueur. No syrup or premade mix.',
    tier: 'workable',
    explanation:
      'Skinny margarita is roughly 150 cal versus a standard margarita\'s 300+, so the framing isn\'t wrong — it\'s just not as clean as people think. Still 15–20g sugar from the lime, agave, or orange liqueur (depending on the bar). Better than the standard, but vodka soda is still meaningfully cleaner if calorie efficiency is the goal. Useful to know which lever you\'re actually pulling.',
  },
  {
    id: 'pre-wedding-skip-lunch',
    scenario: 'Heading to a wedding, planning to drink. You skip lunch to "save calories."',
    context:
      'Empty stomach by 5pm. Drinks start at 6.',
    tier: 'costly',
    explanation:
      'Drinking on an empty stomach accelerates alcohol absorption (no food to slow gastric emptying), crashes blood sugar harder, and dramatically increases the chance of overeating later in the night. The "saved" lunch calories get spent two-fold on bar snacks at 11pm or pancakes at 1am. Eat a protein-forward lunch — it caps the night\'s damage more than skipping does.',
  },
  {
    id: 'nightly-stress-drinks',
    scenario: 'Stressful week. You\'re having 1–2 drinks every night to take the edge off.',
    context:
      'A beer or a glass of wine, every night, after the kids are down.',
    tier: 'costly',
    explanation:
      'Nightly drinking is where the invisible cost compounds. Alcohol within 3 hours of bed suppresses REM sleep (the recovery-load-bearing stage), spikes cortisol overnight, and degrades next-day mood and decision quality. Across a stressful week, the cumulative sleep debt and elevated cortisol make the stress feel worse, not better — you\'re self-medicating with the thing that\'s extending the problem. The calories are not the issue here. The sleep architecture is.',
  },
  {
    id: 'skip-gym-after-drinking',
    scenario:
      'Skipped the gym this morning because you went out last night. Considering doubling up tomorrow.',
    context:
      'Slept 5 hours, mild hangover, would have lifted but bailed. Now thinking about a 90-min "make-up" session tomorrow.',
    tier: 'workable',
    explanation:
      'Skipping was the right call — lifting on five hours of sleep and dehydration is how form breaks down and injuries land. Doubling tomorrow is the wrong response. The plan absorbs a missed session better than a forced-comeback day that risks overtraining a different muscle group or stacking junk volume. Just resume the normal schedule. The trend over 12 weeks doesn\'t notice one missed session.',
  },
  {
    id: 'compensate-by-undereating',
    scenario:
      'Drank 3 drinks last night. Today you skip breakfast and lunch to "catch up."',
    context:
      'Wake up with ~600 surplus calories from drinks + bar snacks. Decide to fast until dinner.',
    tier: 'costly',
    explanation:
      'Same pattern as the off-track recovery rule — compensating with an aggressive deficit produces a rebound binge within 24–48 hours for most users. The 600-calorie surplus is roughly a quarter pound of fat, recovered in a normal cut week without effort. Skipping meals to "earn back" the deficit is what turns one bad night into a full bad week. Resume the floor, no extra credit. Hydrate. Move on.',
  },
];

export const ALCOHOL_TIER_LABEL: Record<AlcoholQuizTier, string> = {
  smart: 'Smart move',
  workable: 'Workable',
  costly: 'Costly',
};

// Closing summary — surfaces after the user finishes the quiz.
// Distilled principles. Stays under ~110 words.
export const ALCOHOL_QUIZ_CLOSING_PRINCIPLES = `Three principles that drove every call above:

1. **Calorie efficiency matters, but the day-after cost matters more.** A few hundred calories from drinks lands inside the math. The wrecked sleep, cortisol disruption, and binge-cycle risk compound invisibly — that's the bill most users underweight.
2. **Don't compensate by undereating.** The instinct after a drinking night is to skip meals to "catch up." That triggers the binge cycle and amplifies the misstep. Resume the floor, no extra credit. The 90-day trend doesn't notice one bad night.
3. **Two drinks is the threshold for a reason.** Past two standard drinks, REM sleep collapses sharply, cortisol clearance falls, and next-day cognition and appetite control degrade more than the calorie cost suggests. The two-drink rule is about recovery, not calories.`;
