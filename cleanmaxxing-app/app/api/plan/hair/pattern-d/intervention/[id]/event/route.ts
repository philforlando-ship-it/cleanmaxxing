// POST /api/plan/hair/pattern-d/intervention/[id]/event
// Logs a new event (side effect, lab result, note, dose change, or
// check-in) against an intervention. event_type controls which
// optional fields are persisted — severity is stripped on non-side-
// effect rows by the service layer.

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import {
  createInterventionEvent,
  getIntervention,
} from '@/lib/interventions/service';

const RequestSchema = z.object({
  event_type: z.enum([
    'side_effect',
    'lab_result',
    'note',
    'dose_change',
    'check_in',
  ]),
  title: z.string().min(1).max(200),
  body: z.string().max(2000).nullable().optional(),
  // Optional ISO date for backdating. When null/omitted, defaults to now()
  // server-side via the table's default.
  event_at: z.string().datetime().nullable().optional(),
  severity: z.enum(['mild', 'moderate', 'concerning']).nullable().optional(),
});

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id: interventionId } = await ctx.params;
  if (!interventionId) {
    return NextResponse.json(
      { error: 'missing_intervention_id' },
      { status: 400 },
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = RequestSchema.safeParse(body);
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

  // Verify the intervention belongs to this user before allowing the
  // event insert. RLS would catch a mismatched user_id on the event
  // row but the explicit check produces a cleaner error.
  const intervention = await getIntervention(supabase, user.id, interventionId);
  if (!intervention) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  try {
    const event = await createInterventionEvent(
      supabase,
      user.id,
      interventionId,
      parsed.data,
    );
    return NextResponse.json({ ok: true, event });
  } catch (err) {
    console.error('intervention_event_create_failed', err);
    return NextResponse.json(
      { error: 'create_failed', message: (err as Error).message },
      { status: 500 },
    );
  }
}
