import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import {
  upsertUserProfile,
  INTERVENTIONS,
  type UserProfilePatch,
} from '@/lib/profile/service';

const RequestSchema = z.object({
  // Tier 1 — body-comp / training / lifestyle grounding. Lives on
  // user_profile per migration 0010. Surfaced to the user via the
  // /progress page's "Current stats" section; will eventually also
  // be writable conversationally by Mister P.
  activity_level: z
    .enum(['sedentary', 'lightly_active', 'moderately_active', 'very_active'])
    .nullable()
    .optional(),
  training_experience: z
    .enum(['none', 'under_1y', '1_to_3y', '3_to_10y', 'over_10y'])
    .nullable()
    .optional(),
  daily_training_minutes: z.number().int().min(0).max(240).nullable().optional(),
  avg_sleep_hours: z.number().min(0).max(14).nullable().optional(),
  diet_restrictions: z.string().max(500).nullable().optional(),
  bf_pct_self_estimate: z
    .enum(['under_12', '12_to_15', '15_to_20', '20_to_25', 'over_25'])
    .nullable()
    .optional(),
  current_weight_lbs: z.number().min(80).max(500).nullable().optional(),
  height_inches: z.number().int().min(48).max(96).nullable().optional(),
  // Tier 2 — set via /profile UI.
  hair_status: z
    .enum(['full', 'thinning', 'receding', 'treating', 'shaved'])
    .nullable()
    .optional(),
  skin_type: z.number().int().min(1).max(6).nullable().optional(),
  current_interventions: z
    .array(z.enum(INTERVENTIONS as readonly [string, ...string[]]))
    .optional(),
  budget_tier: z
    .enum(['under_50', '50_to_150', '150_to_500', 'no_limit'])
    .nullable()
    .optional(),
  relationship_status: z
    .enum(['single', 'dating', 'partnered', 'married'])
    .nullable()
    .optional(),
});

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const parsed = RequestSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const profile = await upsertUserProfile(
    supabase,
    user.id,
    parsed.data as UserProfilePatch,
  );
  return NextResponse.json(profile);
}
