// Auth callback handler. Supabase's email-confirmation link redirects
// here with a `code` query param (PKCE flow). We exchange that code
// for a session via the SSR client — which sets the session cookie
// the rest of the app reads — and then 302 to `next` (default
// /onboarding). Without this handler, the email link lands on a page
// with no session attached and the auth-check redirect ladder
// bounces the user to /login, which is the opposite of "you just
// confirmed your email."
//
// Failure modes worth naming:
//   - missing/expired code: redirect to /login with an error flag so
//     the page can surface a "try resending the link" message.
//   - successful exchange: redirect to `next` (sanitized to a
//     same-origin path so a malicious ?next=https://evil.com can't
//     hijack the post-confirm landing).

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const DEFAULT_NEXT = '/onboarding';

function sanitizeNext(raw: string | null): string {
  if (!raw) return DEFAULT_NEXT;
  // Reject absolute URLs and protocol-relative paths. Only allow
  // same-origin absolute paths starting with a single slash.
  if (!raw.startsWith('/') || raw.startsWith('//')) return DEFAULT_NEXT;
  return raw;
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const next = sanitizeNext(url.searchParams.get('next'));

  if (!code) {
    return NextResponse.redirect(
      new URL('/login?error=missing_code', url.origin),
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(
      new URL('/login?error=confirmation_failed', url.origin),
    );
  }

  return NextResponse.redirect(new URL(next, url.origin));
}
