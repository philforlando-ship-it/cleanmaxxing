// Goal templates: one per POV slug. Used by the suggestion algorithm to
// turn educational POV docs into user-facing goals.
//
// Only populate entries for docs that genuinely make sense as a user goal.
// Meta / avoid / monitor / advanced / niche docs are intentionally absent
// and will never appear in suggestions. Conditional-tier-1 entries like
// acne and hair loss are included but will only surface when the user's
// focus areas match the underlying concern.
//
// Phrasing bias: process-flavored, second-person, concrete. No "journey".
// No moralizing. Titles read as something you could say out loud ("Hit
// your protein target every day") rather than a topic ("Protein Creatine").

export type GoalTemplate = {
  title: string;
  description: string;
  goal_type: 'process' | 'outcome';
};

export const GOAL_TEMPLATES: Record<string, GoalTemplate> = {
  // ==========================================
  // Tier 1 — Non-negotiable foundation
  // ==========================================
  '07-skincare-antiaging': {
    title: 'Build a daily skincare routine',
    description:
      'Cleanser morning and evening, moisturizer twice, SPF every morning. Add a retinoid at night once your skin has adjusted.',
    goal_type: 'process',
  },
  '08-head-hair-balding': {
    title: 'Take your hair seriously',
    description:
      'Protect what you have. Right cut for your face shape, consistent product, and treatment early if you see loss starting.',
    goal_type: 'process',
  },
  '17-environment-lifestyle-design': {
    title: 'Engineer your environment for consistency',
    description:
      'Remove friction from the habits you want and add friction to the ones you don\u2019t. Willpower is not the variable.',
    goal_type: 'process',
  },
  '19-strength-training': {
    title: 'Strength train three times per week',
    description:
      'Compound lifts as the base, progressive overload tracked. Consistency beats intensity for the first year.',
    goal_type: 'process',
  },
  '20-diet-macros': {
    title: 'Dial in your daily macros',
    description:
      'Set a TDEE-based calorie target, protein first, fats and carbs around it. Track until it becomes intuitive.',
    goal_type: 'process',
  },
  '21-protein-creatine': {
    title: 'Hit your protein target every day',
    description:
      'Roughly your bodyweight in grams, spread across three to five meals. Creatine monohydrate once the protein is handled.',
    goal_type: 'process',
  },
  '30-appetite-control': {
    title: 'Master appetite control',
    description:
      'Protein-forward meals, fiber, water, and a structured eating window. Hunger is a design problem, not a willpower test.',
    goal_type: 'process',
  },
  '42-sleep': {
    title: 'Protect your sleep schedule',
    description:
      'Same sleep and wake times most days, dark cool room, no screens in the last hour. Seven to nine hours, tracked loosely.',
    goal_type: 'process',
  },
  '45-meal-plans': {
    title: 'Build a repeatable meal plan',
    description:
      'Three to five meals you actually enjoy, hitting protein and calorie targets. Repetition beats variety for consistency.',
    goal_type: 'process',
  },

  // ==========================================
  // Tier 2 — High impact, address early
  // ==========================================
  '09-facial-hair': {
    title: 'Optimize your facial hair',
    description:
      'Shape what grows well, accept what doesn\u2019t. The right stubble length or beard style lifts every face type.',
    goal_type: 'process',
  },
  '10-grooming': {
    title: 'Build a daily grooming routine',
    description:
      'Eyebrows, nails, ears, nose, skin. Five minutes a day of boring maintenance that most men skip.',
    goal_type: 'process',
  },
  '11-teeth-smile': {
    title: 'Improve your smile',
    description:
      'Whitening if shade is the issue, orthodontics if alignment is. Start with a dental cleaning and an honest assessment.',
    goal_type: 'process',
  },
  '12-style-clothing': {
    title: 'Upgrade your wardrobe fit',
    description:
      'Fit first, fabric second, fashion last. Pick one archetype and rebuild the wardrobe around fit.',
    goal_type: 'process',
  },
  '18-tanning': {
    title: 'Add controlled tanning to your routine',
    description:
      'A slight base tan lifts physique and skin tone. Short, regular exposure with SPF on the face. No tanning beds.',
    goal_type: 'process',
  },
  '48-skin-tone-guidance': {
    title: 'Use color to your advantage',
    description:
      'Dress for your undertone. The right shirt color next to your face does more than most grooming tweaks.',
    goal_type: 'process',
  },
  '50-posture': {
    title: 'Fix your posture',
    description:
      'Daily mobility for the thoracic spine, hips, and neck. Work on stance until upright becomes the default.',
    goal_type: 'process',
  },

  // ==========================================
  // Tier 3 — Meaningful refinements
  // ==========================================
  '05-supplements': {
    title: 'Build a supplement foundation',
    description:
      'Creatine, vitamin D, omega-3, magnesium glycinate. Nothing flashy, nothing without evidence behind it.',
    goal_type: 'process',
  },
  '16-facial-definition-jawline': {
    title: 'Reveal your jawline through fat loss',
    description:
      'Jawline definition is a body fat problem, not a mewing problem. Lean out and the structure shows up on its own.',
    goal_type: 'outcome',
  },
  '23-cardio': {
    title: 'Build a cardio base',
    description:
      'Zone 2 work most of the week, one harder session. Cardio supports the lifting, not the other way around.',
    goal_type: 'process',
  },
  '29-body-hair-methods': {
    title: 'Clean up body hair',
    description:
      'Trim or remove where it makes the physique read cleaner. Chest, back, abdomen based on what you actually have.',
    goal_type: 'process',
  },
  '32-skin-texture-scarring': {
    title: 'Address skin texture',
    description:
      'Retinoid, consistent exfoliation, and professional treatment if scarring is significant. Patience more than product.',
    goal_type: 'process',
  },
  '35-gut-health-fiber': {
    title: 'Improve gut health and fiber intake',
    description:
      'Thirty grams of fiber per day from whole foods, fermented foods a few times a week. Skin and digestion both follow.',
    goal_type: 'process',
  },
  '47-eye-health': {
    title: 'Improve the eye area',
    description:
      'Sleep, hydration, eye-specific moisturizer, and knock out the inflammation drivers. The eye area is a lifestyle mirror.',
    goal_type: 'process',
  },

  // ==========================================
  // Tier 4 — Top performers (rarely auto-suggested)
  // ==========================================
  '46-mobility': {
    title: 'Build daily mobility',
    description:
      'Ten minutes a day on hips, thoracic spine, and ankles. Keeps training sustainable and posture honest.',
    goal_type: 'process',
  },

  // ==========================================
  // Conditional tier 1 — only when focus areas match
  // ==========================================
  '25-acne': {
    title: 'Treat active acne as a system problem',
    description:
      'Salicylic acid, benzoyl peroxide, retinoid if needed. Diet and sleep as upstream inputs, derm escalation if it persists.',
    goal_type: 'process',
  },
  '27-hair-loss-treatments': {
    title: 'Start a hair loss treatment plan',
    description:
      'Minoxidil and finasteride are the evidence-backed stack. Earlier is better. Talk to a doctor about the finasteride side.',
    goal_type: 'process',
  },
};

export function hasTemplate(slug: string): boolean {
  return slug in GOAL_TEMPLATES;
}
