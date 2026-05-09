'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

// Next 16 requires useSearchParams() consumers to sit under a Suspense
// boundary at build time, otherwise the page can't be statically
// prerendered and the build fails. The default export is a thin wrapper;
// SignupForm holds the actual logic.
export default function SignupPage() {
  return (
    <Suspense fallback={null}>
      <SignupForm />
    </Suspense>
  );
}

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  // Email-confirmation pending state. Set when supabase.auth.signUp
  // succeeds but no session is returned — that's Supabase's signal
  // that the project requires email confirmation. The form is
  // replaced with a clear "check your inbox" view in this case so
  // the user knows what to do next instead of being silently
  // bounced to /login.
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const [resendStatus, setResendStatus] = useState<
    'idle' | 'sent' | 'rate_limited' | 'error'
  >('idle');

  // Capture creator referral from ?via=slug and persist in localStorage.
  // ?via= is Rewardful's default referral param. When Rewardful is
  // enabled (NEXT_PUBLIC_REWARDFUL_API_KEY set), the Rewardful script
  // also handles this via its own cookie — the localStorage value is a
  // fallback so attribution still works in local dev and pre-launch
  // environments where Rewardful is disabled.
  const viaSlug = searchParams?.get('via') ?? null;
  useEffect(() => {
    if (viaSlug && typeof window !== 'undefined') {
      try {
        window.localStorage.setItem('cm_via', viaSlug);
      } catch {
        // ignore storage errors
      }
    }
  }, [viaSlug]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!ageConfirmed) {
      setError('You must be 18 or older to use Cleanmaxxing.');
      return;
    }
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        // Confirmation link routes through /auth/callback so the
        // SSR client can exchange the code for a session before the
        // user lands on /onboarding. Without this, the link drops
        // them on /onboarding with no session and they get bounced
        // to /login.
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/onboarding`,
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    // Email-confirmation-required projects: signUp returns the user
    // record but no session. Switch to the "check your inbox" view
    // and let the user click the email link to actually start the
    // app. The welcome email also can't fire yet (no session means
    // /api/email/welcome's getUser() returns null) — it'll fire on
    // first authenticated /today render after they click through.
    if (data.session === null) {
      setPendingEmail(email);
      setLoading(false);
      return;
    }

    // Auto-confirm path (email confirmation disabled in Supabase):
    // session exists immediately, we can fire the welcome email and
    // proceed to onboarding.
    fetch('/api/email/welcome', { method: 'POST' }).catch(() => {
      // ignore — dry-run in dev, server logs the real failure in prod
    });

    router.push('/onboarding');
    router.refresh();
  }

  async function resendConfirmation() {
    if (!pendingEmail || resending) return;
    setResending(true);
    setResendStatus('idle');
    try {
      const res = await fetch('/api/auth/resend-confirmation', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: pendingEmail }),
      });
      if (res.status === 429) {
        setResendStatus('rate_limited');
      } else if (!res.ok) {
        setResendStatus('error');
      } else {
        setResendStatus('sent');
      }
    } catch {
      setResendStatus('error');
    } finally {
      setResending(false);
    }
  }

  if (pendingEmail) {
    return (
      <main className="flex flex-1 items-center justify-center px-6 py-24">
        <div className="w-full max-w-sm">
          <h1 className="text-3xl font-semibold tracking-tight">
            Check your email
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
            We sent a confirmation link to{' '}
            <span className="font-medium text-zinc-900 dark:text-zinc-100">
              {pendingEmail}
            </span>
            . Click the link in that email to finish creating your
            account — you&rsquo;re in the moment you confirm.
          </p>
          <div className="mt-6 rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-sm dark:border-zinc-800 dark:bg-zinc-900/50">
            <p className="font-medium text-zinc-900 dark:text-zinc-100">
              Didn&rsquo;t get it?
            </p>
            <ul className="mt-2 space-y-1 text-xs leading-relaxed text-zinc-700 dark:text-zinc-300">
              <li>
                Check your spam or promotions folder. The sender will
                show as Cleanmaxxing.
              </li>
              <li>
                Confirm{' '}
                <span className="font-mono">{pendingEmail}</span> is
                spelled correctly. If not, sign up again with the right
                address.
              </li>
              <li>It can take a minute or two to arrive.</li>
            </ul>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={resendConfirmation}
                disabled={resending || resendStatus === 'sent'}
                className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                {resending ? 'Resending…' : 'Resend confirmation email'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setPendingEmail(null);
                  setResendStatus('idle');
                  setError(null);
                }}
                className="text-xs text-zinc-500 underline dark:text-zinc-400"
              >
                Use a different email
              </button>
            </div>
            {resendStatus === 'sent' && (
              <p className="mt-2 text-xs text-emerald-700 dark:text-emerald-400">
                New confirmation email sent. Check your inbox.
              </p>
            )}
            {resendStatus === 'rate_limited' && (
              <p className="mt-2 text-xs text-amber-700 dark:text-amber-400">
                Slow down — wait a minute before requesting another.
              </p>
            )}
            {resendStatus === 'error' && (
              <p className="mt-2 text-xs text-red-600 dark:text-red-400">
                Couldn&rsquo;t resend. Try again in a moment.
              </p>
            )}
          </div>
          <p className="mt-6 text-center text-sm text-zinc-600 dark:text-zinc-400">
            Already confirmed?{' '}
            <Link
              href="/login"
              className="font-medium text-zinc-900 underline dark:text-zinc-100"
            >
              Log in
            </Link>
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-24">
      <div className="w-full max-w-sm">
        <h1 className="text-3xl font-semibold tracking-tight">Sign up</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Free to use. No credit card.
        </p>
        <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-500">
          We&rsquo;ll send a confirmation link to your email — click it to
          finish creating your account.
        </p>
        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium">Email</label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium">Password</label>
            <input
              id="password"
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
          </div>
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={ageConfirmed}
              onChange={(e) => setAgeConfirmed(e.target.checked)}
              className="mt-0.5"
            />
            <span>I confirm that I am 18 years of age or older.</span>
          </label>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-zinc-900 px-6 py-3 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
          >
            {loading ? 'Creating account…' : 'Sign up'}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-zinc-600 dark:text-zinc-400">
          Already have an account?{' '}
          <Link href="/login" className="font-medium text-zinc-900 underline dark:text-zinc-100">
            Log in
          </Link>
        </p>
      </div>
    </main>
  );
}
