import type { Question, AgeSegment } from './types';
import { HEIGHT_OPTIONS } from '@/lib/height-options';

// Order matters — this defines the screen sequence.
// Keys must be stable (they become rows in survey_responses.question_key).
export const QUESTIONS: Question[] = [
  // Bucket A: Demographics
  {
    key: 'age',
    prompt: 'How old are you?',
    helper: 'Cleanmaxxing is designed for men 18\u201355.',
    type: 'number',
    min: 18,
    max: 55,
    required: true,
  },
  {
    key: 'height_inches',
    prompt: 'Your height?',
    helper:
      'Optional, but if you skip, your nutrition plan will use qualitative recommendations instead of a calorie + macro target tuned to you. Add it later in /profile if you change your mind.',
    type: 'select',
    options: HEIGHT_OPTIONS,
    required: false,
  },
  {
    key: 'weight_lbs',
    prompt: 'Your weight, in pounds?',
    helper:
      'Optional, but if you skip, your nutrition plan can\u2019t compute a calorie target or safe-rate-capped weight-loss timeline. Add it later in /profile if you change your mind.',
    type: 'number',
    min: 80,
    max: 500,
    required: false,
  },
  {
    // Motivation segment (spec §7 amendment 2026-04-15). Single-select, six
    // options. Routes experience ambiently via users.motivation_segment —
    // the segment is never surfaced back to the user as a label.
    key: 'motivation_segment',
    prompt: 'What\u2019s bringing you to Cleanmaxxing right now?',
    type: 'choice',
    options: [
      { value: 'feel-better-in-own-skin', label: 'I want to feel better in my own skin' },
      { value: 'social-professional-confidence', label: 'I want to feel more confident in social or professional situations' },
      { value: 'specific-event', label: 'I\u2019m preparing for a specific event or life change' },
      { value: 'structured-plan', label: 'I want a structured plan for self-improvement' },
      { value: 'something-specific-bothering-me', label: 'Something specific is bothering me and I want to address it' },
      { value: 'maintenance-aging', label: 'I want to maintain how I look and defend against age-related decline' },
      { value: 'not-sure-yet', label: 'Honestly, I\u2019m not sure yet' },
    ],
    required: true,
  },

  // Bucket B: Physical focus + baseline
  {
    // Picker maps 1:1 to shippable journeys (Pattern A plans). Each
    // value here is the topic slug that downstream services
    // (getActiveJourneysForReflection, /today plan-card gating) read
    // directly. Legacy values from earlier survey vocabulary
    // (fitness, grooming, skin, facial_aesthetics, posture, anti_aging)
    // remain valid in survey_responses for users who pre-date this
    // change; the reflection service still maps them to journeys
    // where applicable.
    key: 'focus_areas',
    prompt: 'Which of these do you most want to improve?',
    helper: 'Pick up to 3.',
    type: 'multi-choice',
    maxSelections: 3,
    options: [
      { value: 'hair', label: 'Hair' },
      { value: 'style', label: 'Style' },
      { value: 'body_composition', label: 'Nutrition' },
      { value: 'strength', label: 'Strength' },
      { value: 'cardio', label: 'Cardio' },
      { value: 'sleep', label: 'Sleep' },
      { value: 'skincare', label: 'Skincare' },
      { value: 'facial_hair', label: 'Facial hair' },
    ],
    required: true,
  },

  // Bucket C: Confidence baseline. Four dimensions, dropped the redundant
  // "overall" slider in 0.4 — the four dimension scores cover the same
  // ground without asking the user to consolidate them himself.
  {
    key: 'confidence_social',
    prompt: 'How confident do you feel in social situations?',
    helper: '1 = not at all, 10 = extremely',
    type: 'slider',
    min: 1,
    max: 10,
    required: true,
  },
  {
    key: 'confidence_work',
    prompt: 'How confident do you feel at work or in your daily life?',
    helper: '1 = not at all, 10 = extremely',
    type: 'slider',
    min: 1,
    max: 10,
    required: true,
  },
  {
    key: 'confidence_physical',
    prompt: 'How confident do you feel about your physical health?',
    helper: '1 = not at all, 10 = extremely',
    type: 'slider',
    min: 1,
    max: 10,
    required: true,
  },
  {
    // Age-feel question. The diagnostic that actually matters for the
    // 30+ ICP is whether the mirror reads younger or older than the
    // actual number. Lives on the confidence_appearance key (and the
    // appearance baseline row downstream) — semantically the better
    // home for "how my age reads" than the physical slot was.
    // Value mapping mirrors lib/confidence/context.ts AGE_FEEL_OPTIONS.
    key: 'confidence_appearance',
    prompt: 'Compared to your actual age, you look\u2026',
    type: 'choice',
    options: [
      { value: '2', label: 'Much older' },
      { value: '4', label: 'A bit older' },
      { value: '6', label: 'About my age' },
      { value: '8', label: 'A bit younger' },
      { value: '10', label: 'Much younger' },
    ],
    required: true,
  },

  // Clinical screening (per spec §13). Last question.
  // A "yes" routes to /onboarding/clinical-resources before submit.
  {
    key: 'clinical_screen',
    prompt: 'Have you ever been diagnosed with or treated for an eating disorder, body dysmorphic disorder, or OCD?',
    helper: 'We ask because this product is not designed to replace clinical care. Your answer is private.',
    type: 'yes-no',
    required: true,
  },
];

export const QUESTION_COUNT = QUESTIONS.length;

export function questionAt(step: number): Question | null {
  if (step < 0 || step >= QUESTIONS.length) return null;
  return QUESTIONS[step];
}

export function questionByKey(key: string): Question | null {
  return QUESTIONS.find((q) => q.key === key) ?? null;
}

export function ageToSegment(age: number): AgeSegment | null {
  if (age >= 18 && age <= 24) return '18-24';
  if (age >= 25 && age <= 32) return '25-32';
  if (age >= 33 && age <= 40) return '33-40';
  if (age >= 41 && age <= 45) return '41-45';
  if (age >= 46 && age <= 55) return '46-55';
  return null;
}
