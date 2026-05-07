// Per-journey adherence question copy for the Weekly Reflection v2
// form (Phase F). One question per journey the user has active.
//
// The user answers with a tier (most_days / some_days / few_or_none).
// Self-reported, not log-validated — even if logs say 4 days, if the
// user feels "most days," that's the answer they should give. The
// reflection is the user's read of their own week, not the system
// grading them.

import type { JourneyTopic } from './types';

export const JOURNEY_QUESTIONS: Record<JourneyTopic, string> = {
  hair: 'Did your hair routine happen this week?',
  style: 'Did you wear pieces aligned with your archetype this week?',
  facial_hair: 'Did you maintain your facial-hair routine this week?',
  sleep: 'Did you protect your sleep this week?',
  skincare: 'Did you do your skincare routine this week?',
  nutrition: 'Did you hit your protein target most days this week?',
  strength: 'Did you complete your strength sessions this week?',
  cardio: 'Did you complete your cardio sessions this week?',
  glp1: 'Did you stay on your GLP-1 dose schedule this week?',
};

export const JOURNEY_LABEL: Record<JourneyTopic, string> = {
  hair: 'Hair',
  style: 'Style',
  facial_hair: 'Facial hair',
  sleep: 'Sleep',
  skincare: 'Skincare',
  nutrition: 'Nutrition',
  strength: 'Strength',
  cardio: 'Cardio',
  glp1: 'GLP-1',
};
