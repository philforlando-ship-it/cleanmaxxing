// Goal templates. Each key is a unique template id (stable, not a POV slug
// since multiple templates can anchor to the same doc — e.g. a process
// "Strength train 3x per week" and an outcome "Add 10 pounds of muscle"
// both anchor to 19-strength-training). Templates turn educational POV
// docs into user-facing goals.
//
// Only populate entries for docs that genuinely make sense as a user goal.
// Meta / avoid / monitor / advanced / niche docs are intentionally absent
// and never appear in suggestions. Conditional-tier-1 entries (acne, hair
// loss) are included but only surface when the user's focus areas match.
//
// Phrasing bias:
//   Process goals use action verbs — "Build," "Hit," "Train," "Run," "Protect,"
//   "Rebuild," "Match," "Start." Titles should pass the "does this describe an
//   action you do, or a state you want to reach?" test. "Improve," "optimize,"
//   "master," "fix," "upgrade" are outcome verbs and should not appear in
//   process titles.
//
//   Outcome goals are measurable end states over a specific time window
//   when possible — "Lose 10% of body weight," "Reach 15% body fat," "Add
//   10 pounds of muscle in 6 months." The time window matters because it
//   prevents outcome goals from becoming open-ended body-dysmorphia loops.

export type GoalTemplate = {
  source_slug: string;
  title: string;
  description: string;
  goal_type: 'process' | 'outcome';
};

export const GOAL_TEMPLATES: Record<string, GoalTemplate> = {
  // ==========================================
  // Tier 1 — Non-negotiable foundation (process)
  // ==========================================
  'skincare-daily-routine': {
    source_slug: '07-skincare-antiaging',
    title: 'Build a daily skincare routine',
    description:
      'Cleanser morning and evening, moisturizer twice, SPF every morning. Add a retinoid at night once your skin has adjusted.',
    goal_type: 'process',
  },
  'hair-protect-daily': {
    source_slug: '08-head-hair-balding',
    title: 'Run a daily hair-care routine',
    description:
      'Right cut for your face shape, consistent product, wash schedule that suits your hair type. Early boring action is what protects you.',
    goal_type: 'process',
  },
  'environment-design': {
    source_slug: '17-environment-lifestyle-design',
    title: 'Engineer your environment for consistency',
    description:
      'Pick one habit to build and one to cut. Lay out gear, pre-pack food, leave the phone in another room \u2014 one friction change per habit until it sticks.',
    goal_type: 'process',
  },
  'strength-train-3x-week': {
    source_slug: '19-strength-training',
    title: 'Strength train 3-5 times per week',
    description:
      'Log every session — exercise, weight, reps. Push one variable up each week, deload when sleep or soreness tanks. Same handful of lifts for months before you change anything.',
    goal_type: 'process',
  },
  'macros-daily': {
    source_slug: '20-diet-macros',
    title: 'Dial in your daily macros',
    description:
      'Set a TDEE-based calorie target, protein first, fats and carbs around it. Track until it becomes intuitive.',
    goal_type: 'process',
  },
  'protein-daily-target': {
    source_slug: '21-protein-creatine',
    title: 'Hit your protein target every day',
    description:
      'Pick three or four high-protein staples and rotate them. Front-load breakfast so dinner doesn\'t have to carry the day. Five grams of creatine, anytime.',
    goal_type: 'process',
  },
  'appetite-structure': {
    source_slug: '30-appetite-control',
    title: 'Eat on a structure that kills cravings',
    description:
      'Two to three meals a day at consistent times, protein in each, fiber and water around them. Keep defaults boring — variety drives overeating.',
    goal_type: 'process',
  },
  'sleep-schedule': {
    source_slug: '42-sleep',
    title: 'Protect your sleep schedule',
    description:
      'Pick a wake time and hold it within thirty minutes on weekends. Wind-down alarm an hour before bed. Defend it against late dinners, late workouts, and late texts.',
    goal_type: 'process',
  },
  'meal-plan-build': {
    source_slug: '45-meal-plans',
    title: 'Build a repeatable meal plan',
    description:
      'A rotation of three breakfasts, three lunches, three dinners — shop once, prep in batches. Lock the rotation for two weeks before swapping anything in or out.',
    goal_type: 'process',
  },

  // ==========================================
  // Tier 2 — High impact, address early (process)
  // ==========================================
  'facial-hair-match': {
    source_slug: '09-facial-hair',
    title: 'Match your facial hair to your face',
    description:
      'Shape what grows well, accept what doesn\u2019t. The right stubble length or beard style lifts every face type.',
    goal_type: 'process',
  },
  'grooming-daily': {
    source_slug: '10-grooming',
    title: 'Build a daily grooming routine',
    description:
      'Nose and ear trimmer, nail clippers, brow scissors and tweezers in one drawer. A ten-minute weekly pass; quick checks the other days.',
    goal_type: 'process',
  },
  'teeth-start-work': {
    source_slug: '11-teeth-smile',
    title: 'Start the dental work your smile needs',
    description:
      'Begin with a dental cleaning and an honest assessment. Whitening, orthodontics, or restoration — whichever applies to you.',
    goal_type: 'process',
  },
  'wardrobe-rebuild-fit': {
    source_slug: '12-style-clothing',
    title: 'Rebuild your wardrobe around fit',
    description:
      'Fit first, fabric second, fashion last. Pick one archetype and rebuild the wardrobe around clothes that actually fit.',
    goal_type: 'process',
  },
  'tanning-controlled': {
    source_slug: '18-tanning',
    title: 'Add controlled tanning to your routine',
    description:
      'A slight base tan lifts physique and skin tone. Short, regular exposure with SPF on the face. No tanning beds.',
    goal_type: 'process',
  },
  'skin-tone-dress-for': {
    source_slug: '48-skin-tone-guidance',
    title: 'Personalize grooming and color for your skin tone',
    description:
      'Figure out your undertone and Fitzpatrick type, then make two passes: the top half of your wardrobe (shirts, jackets, knitwear) for colors that wash you out, and your grooming for tone-specific concerns (PIH, ingrown hairs, hyperpigmentation triggers). Replace as you cycle through normal upgrades.',
    goal_type: 'process',
  },
  'posture-train-daily': {
    source_slug: '50-posture',
    title: 'Train your posture daily',
    description:
      'Daily mobility for the thoracic spine, hips, and neck. Work on stance until upright becomes the default.',
    goal_type: 'process',
  },

  // ==========================================
  // Tier 3 — Meaningful refinements (process)
  // ==========================================
  'supplements-foundation': {
    source_slug: '05-supplements',
    title: 'Build a supplement foundation',
    description:
      'Creatine first. Vitamin D if sun exposure is low or bloodwork says you need it. Omega-3 if your diet is light on fatty fish. Magnesium glycinate only if sleep or stress makes it useful. Nothing flashy, nothing without evidence behind it.',
    goal_type: 'process',
  },
  'cardio-base': {
    source_slug: '23-cardio',
    title: 'Build a cardio base',
    description:
      'Zone 2 work most of the week, one harder session. Cardio supports the lifting, not the other way around.',
    goal_type: 'process',
  },
  'body-hair-cleanup': {
    source_slug: '29-body-hair-methods',
    title: 'Clean up body hair',
    description:
      'Trimmer for chest and abdomen on a two-week cadence; back handled by a partner, salon wax, or laser. Set the calendar reminder so it doesn\'t drift.',
    goal_type: 'process',
  },
  'skin-texture-routine': {
    source_slug: '32-skin-texture-scarring',
    title: 'Run a texture-focused skincare routine',
    description:
      'Retinoid two to three nights a week, building up tolerance; chemical exfoliant on alternate nights. Twelve weeks before judging — book the derm if scarring isn\'t moving.',
    goal_type: 'process',
  },
  'fiber-30g-daily': {
    source_slug: '35-gut-health-fiber',
    title: 'Hit 30 grams of fiber every day',
    description:
      'Whole foods plus fermented foods a few times a week. Skin and digestion both follow. Cheaper than any gut supplement.',
    goal_type: 'process',
  },
  'eye-area-routine': {
    source_slug: '47-eye-health',
    title: 'Run an eye-area skincare routine',
    description:
      'Fix the causes first: sleep debt, dryness, allergies, screen strain, irritation. Then add an eye-specific moisturizer and SPF. Most eye-area issues are function problems, not grooming problems.',
    goal_type: 'process',
  },

  // ==========================================
  // Tier 4 — Top performers (process, rarely auto-suggested)
  // ==========================================
  'mobility-daily': {
    source_slug: '46-mobility',
    title: 'Build daily mobility',
    description:
      'Ten minutes a day on hips, thoracic spine, and ankles. Keeps training sustainable and posture honest.',
    goal_type: 'process',
  },

  // ==========================================
  // Conditional tier 1 — only when focus areas match (process)
  // ==========================================
  'acne-treat-system': {
    source_slug: '25-acne',
    title: 'Treat active acne as a system problem',
    description:
      'Salicylic acid, benzoyl peroxide, retinoid if needed. Diet and sleep as upstream inputs, derm escalation if it persists.',
    goal_type: 'process',
  },
  'hair-loss-start-plan': {
    source_slug: '27-hair-loss-treatments',
    title: 'Start a hair loss treatment plan',
    description:
      'Minoxidil and finasteride are the evidence-backed stack. Earlier is better. Talk to a doctor about the finasteride side.',
    goal_type: 'process',
  },

  // ==========================================
  // Outcome goals — measurable end states over a defined time window
  // ==========================================
  'weight-loss-10-percent': {
    source_slug: '20-diet-macros',
    title: 'Lose 10% of your body weight',
    description:
      'Sustainable rate is one to two pounds per week. Calorie deficit around 300-500 per day, protein target held, strength training preserved.',
    goal_type: 'outcome',
  },
  'body-fat-15-percent': {
    source_slug: '31-calorie-macro-framework',
    title: 'Reach your lean target range',
    description:
      'For most men, somewhere in the 12–15% body fat range is where a trained physique starts to read lean without water or lighting tricks. Pick the end of that range that fits your frame and how visible you want abs to be year-round. Calorie deficit, protein at target, consistent lifting — the unsexy stack that actually works.',
    goal_type: 'outcome',
  },
  'muscle-gain-10lb-6mo': {
    source_slug: '19-strength-training',
    title: 'Add visible muscle over 6 months',
    description:
      'Novice or returning lifter: 5–10 lb of lean mass in a small calorie surplus is realistic. Trained lifter: target measurable strength progression and shoulder/chest/arm circumference change rather than scale weight — gain past the first year is slower and shows up in proportions before pounds. Four sessions a week biased toward the muscles that move the needle — lateral delts, upper chest, lats, arms — with protein at target and sleep as the recovery anchor.',
    goal_type: 'outcome',
  },
  'hair-retention-one-year': {
    source_slug: '27-hair-loss-treatments',
    title: 'Keep your hairline where it is for a year',
    description:
      'Measurable by photos, same lighting, same angle, every 90 days. Treatment plan in place if loss is active. Early action is the lever.',
    goal_type: 'outcome',
  },
  'clear-skin-30-days': {
    source_slug: '25-acne',
    title: 'Have clear skin for 30 days straight',
    description:
      'No new active breakouts for a full month. A simple routine, diet cleanup, and derm visit if the basics are not enough. Photo every week to track.',
    goal_type: 'outcome',
  },
  'jawline-through-fat-loss': {
    source_slug: '16-facial-definition-jawline',
    title: 'Reveal your jawline',
    description:
      'Posture and neck training amplify whatever fat loss is already happening. Wall resets daily, two short neck sessions a week, photo check at week 12.',
    goal_type: 'outcome',
  },

  // ==========================================
  // Self-acceptance (spec §13 — "second leg of the stool")
  // Never auto-suggested; library-only. Process-framed.
  // ==========================================
  'when-to-stop': {
    source_slug: '54-when-to-stop',
    title: 'Practice noticing when to stop',
    description:
      'Self-improvement works best when you can tell the difference between productive effort and self-surveillance. Check in weekly: is this still serving me, or am I just chasing a number?',
    goal_type: 'process',
  },
  'limits-accept': {
    source_slug: '55-limits-self-improvement',
    title: 'Accept the limits of self-improvement',
    description:
      'Every variable has a ceiling. Part of the work is recognizing when you\u2019ve hit yours on something and moving your attention somewhere else.',
    goal_type: 'process',
  },
  'identity-beyond-appearance': {
    source_slug: '56-identity-beyond-appearance',
    title: 'Build an identity beyond your appearance',
    description:
      'Skills, relationships, work, hobbies. The stuff that holds up on the days your face, hair, or body isn\u2019t cooperating. That foundation makes the appearance work sustainable.',
    goal_type: 'process',
  },
};

export function hasTemplateForSlug(slug: string): boolean {
  for (const t of Object.values(GOAL_TEMPLATES)) {
    if (t.source_slug === slug) return true;
  }
  return false;
}

export function templatesForSlug(slug: string): GoalTemplate[] {
  return Object.values(GOAL_TEMPLATES).filter((t) => t.source_slug === slug);
}
