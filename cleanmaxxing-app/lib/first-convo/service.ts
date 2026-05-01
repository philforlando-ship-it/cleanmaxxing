// First-conversation state loader. The "first conversation" is a
// scripted 2-question Mister P exchange that fires once on /today
// after onboarding — open-ended questions about the user's
// blockers and what they've tried before, captured into
// survey_responses under reserved keys. Mister P reads the
// answers in his user-state block to calibrate every later turn.
//
// Stored in survey_responses (free-form text store) rather than a
// new table — these are the same shape as the onboarding
// specific_thing answer and benefit from the same surface. No new
// migration needed.

import type { SupabaseClient } from '@supabase/supabase-js';

export type FirstConvoState = {
  completed: boolean;
  answers: {
    blockers: string;
    triedBefore: string;
  };
};

export const FIRST_CONVO_KEYS = {
  blockers: 'first_convo_blockers',
  triedBefore: 'first_convo_tried_before',
  completedAt: 'first_convo_completed_at',
} as const;

export async function getFirstConvoState(
  supabase: SupabaseClient,
  userId: string,
): Promise<FirstConvoState> {
  const { data } = await supabase
    .from('survey_responses')
    .select('question_key, response_value')
    .eq('user_id', userId)
    .in('question_key', [
      FIRST_CONVO_KEYS.blockers,
      FIRST_CONVO_KEYS.triedBefore,
      FIRST_CONVO_KEYS.completedAt,
    ]);

  const map = new Map<string, string>();
  for (const row of data ?? []) {
    const r = row as { question_key: string; response_value: string | null };
    if (r.response_value) map.set(r.question_key, r.response_value);
  }

  return {
    completed: map.has(FIRST_CONVO_KEYS.completedAt),
    answers: {
      blockers: map.get(FIRST_CONVO_KEYS.blockers) ?? '',
      triedBefore: map.get(FIRST_CONVO_KEYS.triedBefore) ?? '',
    },
  };
}
