// POST /api/plan/facial-hair/growout
// Body: { action: 'start' | 'complete' }
//
// 'start' stamps growout_test_started_at — the user commits to 4 weeks
// of grow-out before evaluating. 'complete' stamps
// growout_test_completed_at, which surfaces a "now decide" prompt
// in the UI. Neither action regenerates the report — the test is a
// behavioral commitment, the next decision (commit to a style /
// stay clean) goes through the normal Edit answers flow.

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

const RequestSchema = z.object({
  action: z.enum(['start', 'complete']),
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

  const update =
    parsed.data.action === 'start'
      ? {
          growout_test_started_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
      : {
          growout_test_completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

  const { error } = await supabase
    .from('facial_hair_assessments')
    .update(update)
    .eq('user_id', user.id);
  if (error) {
    return NextResponse.json(
      { error: 'save_failed', message: error.message },
      { status: 500 },
    );
  }
  return NextResponse.json({ ok: true });
}
