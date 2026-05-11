// POST /api/plan/pattern-d/peptides/intervention/[id]/event
// Log a side effect / lab result / dose change / check-in / note
// against a peptide intervention. Confirms the parent intervention
// belongs to the user AND is type='peptide' before writing.

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
  severity: z.enum(['mild', 'moderate', 'concerning']).nullable().optional(),
  event_at: z.string().datetime().nullable().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
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

  const intervention = await getIntervention(supabase, user.id, id);
  if (!intervention) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  if (intervention.type !== 'peptide') {
    return NextResponse.json({ error: 'wrong_topic' }, { status: 400 });
  }

  try {
    const event = await createInterventionEvent(supabase, user.id, id, {
      event_type: parsed.data.event_type,
      title: parsed.data.title,
      body: parsed.data.body ?? null,
      severity: parsed.data.severity ?? null,
      event_at: parsed.data.event_at ?? null,
    });
    return NextResponse.json({ ok: true, event });
  } catch (err) {
    console.error('peptide_event_create_failed', err);
    return NextResponse.json(
      { error: 'create_failed', message: (err as Error).message },
      { status: 500 },
    );
  }
}
