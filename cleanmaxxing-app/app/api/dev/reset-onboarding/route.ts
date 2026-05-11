import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Dev-only helper that resets the current user's onboarding state
// back to the journey picker. Clears onboarding_completed_at, leaves
// survey_responses + age_segment + confidence_dimensions in place.
// Chat history and mister_p_queries are untouched.
//
// Pre-Tier-3 this also abandoned the user's active goals; the goals
// system retired 2026-05-10 and that step is no longer needed.
//
// Gated on NODE_ENV === 'development' so it can never run in
// production. The /today dev button that calls this endpoint is
// also dev-gated.
export async function POST() {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not available' }, { status: 403 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { error: userErr } = await supabase
    .from('users')
    .update({ onboarding_completed_at: null })
    .eq('id', user.id);
  if (userErr) {
    return NextResponse.json({ error: userErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
