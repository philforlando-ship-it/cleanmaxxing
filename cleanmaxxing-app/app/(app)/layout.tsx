// Group layout for all auth-gated app pages. Adds the persistent top nav
// across /today, /goals, /goals/library, /goals/[id], /settings, etc.
// The nav hides itself on onboarding and POV reader routes (see AppNav).

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AppNav } from '@/components/app-nav';

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Unauthed users hitting any (app) route redirect to login. Individual
  // pages still re-check this for their own data fetches, but the layout
  // short-circuits the nav render so we never leak a signed-out chrome.
  if (!user) redirect('/login');

  return (
    <>
      <AppNav userEmail={user.email ?? ''} />
      {children}
    </>
  );
}
