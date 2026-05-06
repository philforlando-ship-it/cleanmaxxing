// POST /api/plan/hair/pattern-d/start-protocol
// User has gotten a prescription / started treatment. Creates one
// intervention row per selected type (finasteride / minoxidil) with
// status='on_protocol' + the optional protocol details. Idempotent at
// the (user, type) level — if an active intervention of the requested
// type already exists, we skip creating a duplicate.
//
// Also stamps hair_assessments.pattern_d_treatment_started_at if not
// already set, so the legacy "is on protocol" check used by the
// existing surfaces keeps reporting correctly during the coexistence
// period.

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import {
  createIntervention,
  findActiveInterventionByType,
} from '@/lib/interventions/service';
import { markPatternDTreatmentStarted } from '@/lib/hair/service';
import type { InterventionType } from '@/lib/interventions/types';

const ALLOWED_TYPES = ['finasteride', 'minoxidil'] as const;

const RequestSchema = z.object({
  types: z.array(z.enum(ALLOWED_TYPES)).min(1).max(2),
  dose: z.string().max(200).nullable().optional(),
  frequency: z.string().max(200).nullable().optional(),
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

  const { types, dose, frequency, prescriber_status, notes } = parsed.data;

  // Create one intervention per selected type. Skip any that already
  // exist as on_protocol — re-clicking the start button shouldn't
  // duplicate rows.
  const created: { type: InterventionType; id: string; skipped: boolean }[] = [];
  for (const type of types) {
    const existing = await findActiveInterventionByType(
      supabase,
      user.id,
      type,
    );
    if (existing) {
      created.push({ type, id: existing.id, skipped: true });
      continue;
    }
    try {
      const inserted = await createIntervention(supabase, user.id, {
        type,
        status: 'on_protocol',
        dose: dose ?? null,
        frequency: frequency ?? null,
        prescriber_status: prescriber_status ?? null,
        notes: notes ?? null,
      });
      created.push({ type, id: inserted.id, skipped: false });
    } catch (err) {
      console.error('intervention_create_failed', { type, err });
      return NextResponse.json(
        {
          error: 'create_failed',
          message: (err as Error).message,
          type,
        },
        { status: 500 },
      );
    }
  }

  // Backwards-compat: stamp the soft signal on hair_assessments so
  // the existing isOnProtocol check (which reads this column) keeps
  // working without modification. No-op if already set or if no
  // assessment row exists yet.
  try {
    await markPatternDTreatmentStarted(supabase, user.id);
  } catch {
    // Non-fatal — the new intervention rows are the source of truth
    // going forward. Old reads might lag a beat but the rich view
    // still renders.
  }

  return NextResponse.json({ ok: true, created });
}
