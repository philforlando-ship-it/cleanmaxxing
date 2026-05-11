// Group layout for all auth-gated app pages. Adds the persistent top nav
// across /today, /goals, /goals/library, /goals/[id], /settings, etc.
// The nav hides itself on onboarding and POV reader routes (see AppNav).

import { redirect } from 'next/navigation';
import { createClient, getUser } from '@/lib/supabase/server';
import { AppNav } from '@/components/app-nav';
import { TimezoneSync } from '@/components/timezone-sync';
import { isAdmin } from '@/lib/admin/is-admin';
import { getRecentConversation } from '@/lib/mister-p/conversation';
import type { ChatMessage } from '@/app/(app)/today/mister-p-chat-card';

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();
  const supabase = await createClient();

  // Unauthed users hitting any (app) route redirect to login. Individual
  // pages still re-check this for their own data fetches, but the layout
  // short-circuits the nav render so we never leak a signed-out chrome.
  if (!user) redirect('/login');

  // Read the persisted timezone so TimezoneSync can short-circuit
  // when the browser-detected zone matches. One small select; the
  // result is also implicitly the source of truth callers compare
  // against on first authenticated render after a tz change.
  // Hydrate the Mister P general thread in parallel — the launcher
  // mounted in the nav needs it on every (app) page render.
  const [{ data: userRow }, generalPairs] = await Promise.all([
    supabase.from('users').select('timezone').eq('id', user.id).maybeSingle(),
    getRecentConversation(supabase, user.id, { goalId: null }),
  ]);
  const currentTimezone =
    (userRow?.timezone as string | null) ?? 'America/New_York';

  const initialGeneralThread: ChatMessage[] = [];
  for (const pair of generalPairs) {
    initialGeneralThread.push(
      { role: 'user', content: pair.question },
      { role: 'assistant', content: pair.answer },
    );
  }

  return (
    <>
      <AppNav
        userEmail={user.email ?? ''}
        isAdmin={isAdmin(user.email)}
        initialGeneralThread={initialGeneralThread}
      />
      <TimezoneSync current={currentTimezone} />
      {children}
    </>
  );
}
