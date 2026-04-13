import { QUESTIONS } from './questions';

// Index of the first question the user has NOT yet answered.
// Returns QUESTIONS.length when every question has a row in survey_responses
// (caller should treat that as "done, route to finalize").
export function nextStepIndex(answeredKeys: Set<string>): number {
  for (let i = 0; i < QUESTIONS.length; i++) {
    if (!answeredKeys.has(QUESTIONS[i].key)) return i;
  }
  return QUESTIONS.length;
}
