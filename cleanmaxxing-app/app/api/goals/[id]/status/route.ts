import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const ALLOWED_STATUSES = new Set(['active', 'completed', 'abandoned']);

// Update a goal's status. Used by the detail page's "Mark complete" and
// "Abandon" actions. Setting status to 'completed' also stamps
// completed_at; setting to 'abandoned' leaves completed_at null because
// it wasn't finished.
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

  let body: { status?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const status = body.status;
  if (typeof status !== 'string' || !ALLOWED_STATUSES.has(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  }

  const patch: { status: string; completed_at?: string | null } = { status };
  if (status === 'completed') {
    patch.completed_at = new Date().toISOString();
  } else if (status === 'active') {
    patch.completed_at = null;
  }

  const { error, data } = await supabase
    .from('goals')
    .update(patch)
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
