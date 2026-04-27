// User profile service. Owns the read/write contract for the
// user_profile table. Both the /profile UI and Mister P's read path
// go through this so the canonical shape lives in one place.

import type { SupabaseClient } from '@supabase/supabase-js';

export type ActivityLevel =
  | 'sedentary'
  | 'lightly_active'
  | 'moderately_active'
  | 'very_active';

export type TrainingExperience =
  | 'none'
  | 'under_1y'
  | '1_to_3y'
  | '3_to_10y'
  | 'over_10y';

export type BodyFatEstimate =
  | 'under_12'
  | '12_to_15'
  | '15_to_20'
  | '20_to_25'
  | 'over_25';

export type HairStatus =
  | 'full'
  | 'thinning'
  | 'receding'
  | 'treating'
  | 'shaved';

export type BudgetTier = 'under_50' | '50_to_150' | '150_to_500' | 'no_limit';

export type RelationshipStatus = 'single' | 'dating' | 'partnered' | 'married';

export type Intervention =
  | 'trt'
  | 'glp1'
  | 'finasteride'
  | 'minoxidil'
  | 'retinoid'
  | 'accutane';

export const INTERVENTIONS: ReadonlyArray<Intervention> = [
  'trt',
  'glp1',
  'finasteride',
  'minoxidil',
  'retinoid',
  'accutane',
] as const;

export type UserProfile = {
  user_id: string;
  // Tier 1 — body-comp / training / lifestyle grounding
  activity_level: ActivityLevel | null;
  training_experience: TrainingExperience | null;
  daily_training_minutes: number | null;
  avg_sleep_hours: number | null;
  diet_restrictions: string | null;
  bf_pct_self_estimate: BodyFatEstimate | null;
  // Tier 2 — set via /profile UI
  hair_status: HairStatus | null;
  skin_type: number | null;
  current_interventions: Intervention[];
  budget_tier: BudgetTier | null;
  relationship_status: RelationshipStatus | null;
  updated_at: string;
};

export type UserProfilePatch = Partial<
  Omit<UserProfile, 'user_id' | 'updated_at'>
>;

export const EMPTY_PROFILE: Omit<UserProfile, 'user_id' | 'updated_at'> = {
  activity_level: null,
  training_experience: null,
  daily_training_minutes: null,
  avg_sleep_hours: null,
  diet_restrictions: null,
  bf_pct_self_estimate: null,
  hair_status: null,
  skin_type: null,
  current_interventions: [],
  budget_tier: null,
  relationship_status: null,
};

export async function getUserProfile(
  supabase: SupabaseClient,
  userId: string,
): Promise<UserProfile> {
  const { data, error } = await supabase
    .from('user_profile')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  if (data) return data as UserProfile;
  // No row yet — return an empty stub so callers can render a clean form.
  return {
    user_id: userId,
    ...EMPTY_PROFILE,
    updated_at: new Date().toISOString(),
  };
}

export async function upsertUserProfile(
  supabase: SupabaseClient,
  userId: string,
  patch: UserProfilePatch,
): Promise<UserProfile> {
  // Strip undefined keys so the upsert doesn't blow away unrelated columns
  // when the form submits a subset.
  const cleaned: Record<string, unknown> = { user_id: userId };
  for (const [k, v] of Object.entries(patch)) {
    if (v !== undefined) cleaned[k] = v;
  }
  cleaned.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from('user_profile')
    .upsert(cleaned, { onConflict: 'user_id' })
    .select('*')
    .single();
  if (error) throw error;
  return data as UserProfile;
}
