import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Onboarding terminator. Replaces the old /api/goals/accept role of
// being the final step that flips users.onboarding_completed_at —
// the journey-based flow no longer creates goal rows at the end of
// onboarding, so the timestamp is set without any goal writes.
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('users')
    .select('age_segment, onboarding_completed_at')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile?.age_segment) {
    return NextResponse.json(
      { error: 'Survey not yet submitted.' },
      { status: 400 },
    );
  }

  if (profile.onboarding_completed_at) {
    return NextResponse.json({ ok: true, already: true });
  }

  const { error: userErr } = await supabase
    .from('users')
    .update({ onboarding_completed_at: new Date().toISOString() })
    .eq('id', user.id);
  if (userErr) {
    return NextResponse.json({ error: userErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
