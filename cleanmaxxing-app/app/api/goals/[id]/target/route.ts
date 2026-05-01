// Update or clear a goal's target_date. PUT body shape:
//   { target_date: 'YYYY-MM-DD' | null }
// Mirrors the baseline-update route's pattern. Null clears the
// finishline; the WeeklyFocusCard then falls back to the
// open-ended "Week N" framing.

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

  let body: { target_date?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const raw = body.target_date;
  let target: string | null = null;
  if (raw !== null && raw !== undefined && raw !== '') {
    if (typeof raw !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      return NextResponse.json(
        { error: 'Invalid target_date — use YYYY-MM-DD.' },
        { status: 400 },
      );
    }
    target = raw;
  }

  const { error } = await supabase
    .from('goals')
    .update({ target_date: target })
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
