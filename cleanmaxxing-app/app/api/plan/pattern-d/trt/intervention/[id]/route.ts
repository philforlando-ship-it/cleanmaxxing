// PATCH /api/plan/pattern-d/trt/intervention/[id]
// Edit dose / frequency / titration_schedule / prescriber_status /
// notes. RLS prevents cross-user updates; we also re-check ownership
// at the type filter so a user can't edit non-trt rows through this
// route.
//
// DELETE /api/plan/pattern-d/trt/intervention/[id]
// Hard-delete the row. Mostly for cleanup if the user added a row by
// mistake — for "I stopped" the intent is to flip status to 'off'
// via /end, not delete.

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import {
  deleteIntervention,
  getIntervention,
  updateIntervention,
} from '@/lib/interventions/service';

const PatchSchema = z.object({
  dose: z.string().max(200).nullable().optional(),
  frequency: z.string().max(200).nullable().optional(),
  titration_schedule: z.string().max(500).nullable().optional(),
  prescriber_status: z
    .enum(['no_prescription', 'prescribed', 'over_the_counter', 'unknown'])
    .nullable()
    .optional(),
  notes: z.string().max(2000).nullable().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid_request', issues: parsed.error.issues },
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

  const existing = await getIntervention(supabase, user.id, id);
  if (!existing) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  if (existing.type !== 'trt') {
    return NextResponse.json({ error: 'wrong_topic' }, { status: 400 });
  }

  try {
    const updated = await updateIntervention(supabase, user.id, id, parsed.data);
    return NextResponse.json({ ok: true, intervention: updated });
  } catch (err) {
    console.error('trt_intervention_update_failed', err);
    return NextResponse.json(
      { error: 'update_failed', message: (err as Error).message },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const existing = await getIntervention(supabase, user.id, id);
  if (!existing) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  if (existing.type !== 'trt') {
    return NextResponse.json({ error: 'wrong_topic' }, { status: 400 });
  }

  try {
    await deleteIntervention(supabase, user.id, id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('trt_intervention_delete_failed', err);
    return NextResponse.json(
      { error: 'delete_failed', message: (err as Error).message },
      { status: 500 },
    );
  }
}
