// PATCH /api/plan/hair/pattern-d/intervention/[id]
// Update protocol details on an existing intervention row. Used by the
// On Protocol surface's "edit protocol details" inline form. Only
// touches the fields the user can actually edit — dose, frequency,
// titration_schedule, notes, prescriber_status. Status transitions
// (pause / off / restart) live in a separate route and aren't exposed
// in this Phase 2 v1 scope.

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import {
  getIntervention,
  updateIntervention,
} from '@/lib/interventions/service';

const PatchSchema = z.object({
  dose: z.string().max(200).nullable().optional(),
  frequency: z.string().max(200).nullable().optional(),
  titration_schedule: z.string().max(500).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
  prescriber_status: z
    .enum(['no_prescription', 'prescribed', 'over_the_counter', 'unknown'])
    .nullable()
    .optional(),
});

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  if (!id) {
    return NextResponse.json({ error: 'missing_id' }, { status: 400 });
  }

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

  try {
    const updated = await updateIntervention(supabase, user.id, id, parsed.data);
    return NextResponse.json({ ok: true, intervention: updated });
  } catch (err) {
    console.error('intervention_update_failed', err);
    return NextResponse.json(
      { error: 'update_failed', message: (err as Error).message },
      { status: 500 },
    );
  }
}
