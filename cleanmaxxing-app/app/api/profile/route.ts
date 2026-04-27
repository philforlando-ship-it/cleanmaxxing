import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import {
  upsertUserProfile,
  INTERVENTIONS,
  type UserProfilePatch,
} from '@/lib/profile/service';

const RequestSchema = z.object({
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
