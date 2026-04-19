import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const ALLOWED_BASELINE_STAGES = new Set(['new', 'light', 'partial', 'established']);

// Update the baseline_stage on an existing goal. Used by the weekly focus
// card's "adjust starting point" control — the user can correct their
// initial placement after the fact without re-accepting the goal.
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

  let body: { baseline_stage?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const stage = body.baseline_stage;
  if (typeof stage !== 'string' || !ALLOWED_BASELINE_STAGES.has(stage)) {
    return NextResponse.json({ error: 'Invalid baseline_stage' }, { status: 400 });
  }

  const { error, data } = await supabase
    .from('goals')
    .update({ baseline_stage: stage })
    .eq('id', id)
    .eq('user_id', user.id)
    .select('id')
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: 'Goal not found.' }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
