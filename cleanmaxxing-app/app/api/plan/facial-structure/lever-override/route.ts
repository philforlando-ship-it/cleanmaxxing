// POST /api/plan/facial-structure/lever-override
// Body: { lever: 'body_comp' | ... | 'framing' | null }
//
// Sets facial_structure_assessments.primary_lever_override to the
// chosen lever (or null to clear and fall back to the computed value).
// Stage cards re-read after refresh.

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

const RequestSchema = z.object({
  lever: z
    .enum([
      'body_comp',
      'puff_diagnostic',
      'posture_neck',
      'cosmetic_patternd',
      'framing',
    ])
    .nullable(),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid_request' },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { error } = await supabase
    .from('facial_structure_assessments')
    .update({
      primary_lever_override: parsed.data.lever,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', user.id);
  if (error) {
    return NextResponse.json(
      { error: 'save_failed', message: error.message },
      { status: 500 },
    );
  }
  return NextResponse.json({ ok: true });
}
