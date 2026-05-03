import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Returns the current user's facial-analysis history, newest first,
// capped at 20 rows. RLS enforces the user_id scope; this handler
// does not need to filter by user_id explicitly.
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('facial_analyses')
    .select(
      'id, before_slot, after_slot, before_captured_at, after_captured_at, angles_used, observations, refused, refusal_reason, model, created_at',
    )
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    return NextResponse.json(
      { error: 'list_failed', message: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ analyses: data ?? [] });
}
