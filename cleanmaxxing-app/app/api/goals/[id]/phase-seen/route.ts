// Records the onramp phase the user has acknowledged for a
// goal. /today's Current Focus card uses this to suppress phase
// content the user has already read; the next time the goal
// crosses into a new range block (or graduates), the surface
// re-fires.
//
// Body shape: { phase: string }. Phase is the onramp's
// block.range string ("1-4", "5-8") or the literal "graduated"
// for completed walkthroughs. Validated as non-empty string;
// the canonical-value check is informal because new onramps
// could introduce new range patterns and we don't want to
// hard-code an enum here.

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { id } = await params;

  let body: { phase?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const phase = body.phase;
  if (typeof phase !== 'string' || phase.length === 0 || phase.length > 64) {
    return NextResponse.json({ error: 'Invalid phase' }, { status: 400 });
  }

  const { error } = await supabase
    .from('goals')
    .update({ last_phase_seen: phase })
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
