import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Dev-only helper that resets the current user's onboarding state back to
// the goal picker without re-walking the survey. Clears active goals and
// onboarding_completed_at, leaves survey_responses + age_segment +
// confidence_dimensions in place. Chat history and mister_p_queries are
// untouched.
//
// Gated on NODE_ENV === 'development' so it can never run in production.
// The /today dev button that calls this endpoint is also dev-gated.
export async function POST() {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not available' }, { status: 403 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  // Mark existing goals abandoned rather than deleting — preserves history.
  const { error: goalsErr } = await supabase
    .from('goals')
    .update({ status: 'abandoned' })
    .eq('user_id', user.id)
    .eq('status', 'active');
  if (goalsErr) {
    return NextResponse.json({ error: goalsErr.message }, { status: 500 });
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
