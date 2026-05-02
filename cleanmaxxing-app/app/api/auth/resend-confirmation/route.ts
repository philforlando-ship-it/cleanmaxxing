// Resend the Supabase signup confirmation email. Surfaced from the
// post-signup "check your inbox" view as "Didn't get it? Resend."
// Supabase's auth.resend rate-limits this server-side so we don't
// need to add our own throttling.
//
// We accept the email in the request body rather than reading it
// from the session, because the session doesn't exist yet (the user
// has signed up but not confirmed). The email is validated as a
// shape but not against any user table — Supabase handles "unknown
// email" silently to avoid leaking which addresses are registered.

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

const RequestSchema = z.object({
  email: z.string().email().max(320),
});

export async function POST(req: NextRequest) {
  const parsed = RequestSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
  }

  const supabase = await createClient();
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL?.trim() || 'https://cleanmaxxing.com';

  const { error } = await supabase.auth.resend({
    type: 'signup',
    email: parsed.data.email,
    options: {
      emailRedirectTo: `${appUrl}/auth/callback?next=/onboarding`,
    },
  });

  if (error) {
    // Surface rate-limit and quota errors as 429 so the UI can
    // distinguish "wait and try again" from a real misconfiguration.
    const status =
      error.status === 429 || /rate.?limit/i.test(error.message) ? 429 : 500;
    return NextResponse.json({ error: error.message }, { status });
  }

  return NextResponse.json({ ok: true });
}
