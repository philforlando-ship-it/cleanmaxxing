import type { Question, AgeSegment } from './types';

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
    prompt: 'Your height, in inches?',
    helper: 'Optional. Skip if you\u2019d rather not share.',
    type: 'number',
    min: 48,
    max: 96,
    required: false,
  },
  {
    key: 'weight_lbs',
    prompt: 'Your weight, in pounds?',
    helper: 'Optional. Skip if you\u2019d rather not share.',
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
    key: 'focus_areas',
    prompt: 'Which of these do you most want to improve?',
    helper: 'Pick up to 3.',
    type: 'multi-choice',
    maxSelections: 3,
    options: [
      { value: 'fitness', label: 'Fitness' },
      { value: 'body_composition', label: 'Body composition' },
      { value: 'skin', label: 'Skin' },
      { value: 'hair', label: 'Hair' },
      { value: 'facial_aesthetics', label: 'Facial aesthetics' },
      { value: 'style', label: 'Style' },
      { value: 'posture', label: 'Posture' },
      { value: 'grooming', label: 'Grooming' },
      { value: 'anti_aging', label: 'Anti-aging' },
    ],
    required: true,
  },
  {
    key: 'specific_thing',
    prompt: 'Is there one specific thing you think about more than you\u2019d like to?',
    helper: 'Optional. You can skip this.',
    type: 'text',
    required: false,
  },

  // Bucket C: Confidence baseline. Four dimensions, dropped the redundant
  // "overall" slider in 0.4 — the four dimension scores cover the same
  // ground without asking the user to consolidate them himself.
  {
    key: 'confidence_appearance',
    prompt: 'How confident do you feel about your appearance?',
    helper: '1 = not at all, 10 = extremely',
    type: 'slider',
    min: 1,
    max: 10,
    required: true,
  },
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
    // Age-feel question. Replaces the old "physical confidence" slider for
    // the 30+ ICP — the diagnostic that actually matters at this age is
    // whether the mirror reads younger or older than the actual number.
    // Value mapping mirrors lib/confidence/context.ts AGE_FEEL_OPTIONS so
    // the onboarding write lands on the same scale as weekly reflections.
    key: 'confidence_physical',
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
