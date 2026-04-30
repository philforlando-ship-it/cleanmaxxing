// Profile completion percentage. Powers the /today nudge card that
// reminds users to fill out their profile fields after onboarding.
//
// Counts only structured self-report fields where null unambiguously
// means "not filled in." Excluded by design:
//   - current_interventions (multi-select array; "I'm not on
//     anything" is a valid empty answer that would otherwise prevent
//     ever reaching 100%)
//   - diet_restrictions (free text; "no restrictions" is a valid
//     empty answer for the same reason)
//   - photos at any slot — taking a baseline photo isn't profile
//     completion, and 30d/90d/180d photos are time-gated and not
//     yet eligible for most users
//
// For weight and height, falls back to the onboarding survey
// answer when the user_profile column is null. Same merge logic
// the /profile page uses to hydrate its forms — keeps the
// percentage honest for users who answered in onboarding but
// haven't visited /profile yet.

import type { SupabaseClient } from '@supabase/supabase-js';
import { getUserProfile } from './service';

export type ProfileCompletion = {
  filled: number;
  total: number;
  percentage: number; // 0–100, rounded
};

export async function getProfileCompletion(
  supabase: SupabaseClient,
  userId: string,
): Promise<ProfileCompletion> {
  const profile = await getUserProfile(supabase, userId);

  let hasWeight = profile.current_weight_lbs !== null;
  let hasHeight = profile.height_inches !== null;
  if (!hasWeight || !hasHeight) {
    const { data: surveyAnswers } = await supabase
      .from('survey_responses')
      .select('question_key, response_value')
      .eq('user_id', userId)
      .in('question_key', ['weight_lbs', 'height_inches']);
    const byKey = new Map<string, string>();
    for (const row of surveyAnswers ?? []) {
      const r = row as { question_key: string; response_value: string | null };
      if (r.response_value) byKey.set(r.question_key, r.response_value);
    }
    if (!hasWeight) {
      const raw = byKey.get('weight_lbs');
      hasWeight = Boolean(raw && Number.isFinite(Number(raw)));
    }
    if (!hasHeight) {
      const raw = byKey.get('height_inches');
      hasHeight = Boolean(raw && Number.isFinite(Number(raw)));
    }
  }

  const fields: boolean[] = [
    profile.activity_level !== null,
    profile.training_experience !== null,
    profile.daily_training_minutes !== null,
    profile.avg_sleep_hours !== null,
    profile.bf_pct_self_estimate !== null,
    hasWeight,
    hasHeight,
    profile.hair_status !== null,
    profile.skin_type !== null,
    profile.budget_tier !== null,
    profile.relationship_status !== null,
  ];
  const total = fields.length;
  const filled = fields.filter(Boolean).length;
  const percentage = total === 0 ? 100 : Math.round((filled / total) * 100);
  return { filled, total, percentage };
}
