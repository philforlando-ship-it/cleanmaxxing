// POST /api/plan/pattern-d/peptides/start-protocol
// User started a GH-secretagogue protocol. Creates one intervention
// row with type='peptide' + status='on_protocol' + the optional
// protocol details. Idempotent: re-clicking the start button when an
// active row already exists returns the existing id rather than
// creating a duplicate.

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import {
  createIntervention,
  findActiveInterventionByType,
} from '@/lib/interventions/service';

const RequestSchema = z.object({
  dose: z.string().max(200).nullable().optional(),
  frequency: z.string().max(200).nullable().optional(),
  titration_schedule: z.string().max(500).nullable().optional(),
  prescriber_status: z
    .enum(['no_prescription', 'prescribed', 'over_the_counter', 'unknown'])
    .nullable()
    .optional(),
  notes: z.string().max(2000).nullable().optional(),
});

export async function POST(req: NextRequest) {
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

  const existing = await findActiveInterventionByType(
    supabase,
    user.id,
    'peptide',
  );
  if (existing) {
    return NextResponse.json({ ok: true, id: existing.id, skipped: true });
  }

  try {
    const inserted = await createIntervention(supabase, user.id, {
      type: 'peptide',
      status: 'on_protocol',
      dose: parsed.data.dose ?? null,
      frequency: parsed.data.frequency ?? null,
      titration_schedule: parsed.data.titration_schedule ?? null,
      prescriber_status: parsed.data.prescriber_status ?? null,
      notes: parsed.data.notes ?? null,
    });
    return NextResponse.json({ ok: true, id: inserted.id, skipped: false });
  } catch (err) {
    console.error('peptide_intervention_create_failed', err);
    return NextResponse.json(
      { error: 'create_failed', message: (err as Error).message },
      { status: 500 },
    );
  }
}
