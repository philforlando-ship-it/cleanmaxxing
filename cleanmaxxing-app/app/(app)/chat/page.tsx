// /chat — focused Mister P chat surface.
//
// Same chat card that's embedded on /today, but as a standalone page
// so deep-linking to it ("Ask Mister P" from /photos, the escape hatch,
// future surfaces) lands the user in the chat — not in the middle of
// /today's busy tile stack.
//
// All chat state lives in the same `mister_p_queries` table and the
// same journey-scoped thread model — switching between /today and
// /chat preserves continuity in both directions. The chat-card
// component is the single source of truth; both surfaces just mount
// it with server-loaded bootstrap.

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient, getUser } from '@/lib/supabase/server';
import { loadChatBootstrap, GENERAL_KEY } from '@/lib/mister-p/load-chat';
import { MisterPChatCard } from '../today/mister-p-chat-card';

type Props = {
  // ?prefill=... pre-fills the chat input on mount (e.g. when the
  // user clicks a Mister P chip on /photos).
  // ?thread=<journey_slug> | 'general' switches the active thread.
  // If the requested thread isn't available (user hasn't picked the
  // journey), the chat card falls back to General silently.
  searchParams: Promise<{ prefill?: string; thread?: string }>;
};

export default async function ChatPage({ searchParams }: Props) {
  const user = await getUser();
  if (!user) redirect('/login');
  const supabase = await createClient();

  const params = await searchParams;
  const prefillText = typeof params.prefill === 'string' ? params.prefill : null;
  const requestedThread =
    typeof params.thread === 'string' ? params.thread : null;

  const { journeys, initialThreads } = await loadChatBootstrap(
    supabase,
    user.id,
  );

  // Resolve the requested thread to a key the chat card knows about.
  // 'general' sentinel maps to GENERAL_KEY; an unknown journey slug
  // falls back to GENERAL_KEY rather than rendering nothing.
  const availableSlugs = new Set([
    GENERAL_KEY,
    ...journeys.map((j) => j.slug),
  ]);
  let initialThreadKey: string | null = null;
  if (requestedThread) {
    if (requestedThread === 'general') {
      initialThreadKey = GENERAL_KEY;
    } else if (availableSlugs.has(requestedThread)) {
      initialThreadKey = requestedThread;
    } else {
      initialThreadKey = GENERAL_KEY;
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <Link
        href="/today"
        className="text-xs text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
      >
        ← Back to Today
      </Link>

      <header className="mt-6">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
          Ask Mister P
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-zinc-700 dark:text-zinc-300">
          One thread per journey. He sees your baseline + latest photos
          when you ask on Pro. He answers when you ask — he won&rsquo;t
          volunteer observations.
        </p>
      </header>

      <div className="mt-8">
        <MisterPChatCard
          journeys={journeys}
          initialThreads={initialThreads}
          initialPrefill={prefillText}
          initialThreadKey={initialThreadKey}
        />
      </div>
    </main>
  );
}
