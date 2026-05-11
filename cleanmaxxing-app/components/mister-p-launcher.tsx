'use client';

// Ambient Mister P access from anywhere in the (app) group. A button
// in the AppNav header opens a modal containing the same MisterPChatCard
// that lives on /today, locked to the unscoped General thread. The
// thread is the same conversation history the user sees on /today and
// /goals/[id] — opening from /plan/skincare and from /today is the
// same conversation, not a new one.
//
// Trigger surfaces:
//   - Visible button in AppNav (trusted-advisor pattern, not a
//     support-widget bubble)
//   - Cmd/Ctrl+K (Linear/Notion-style, doesn't fight input fields the
//     way "/" would)
//
// On open from a journey page (/plan/<topic>), the input placeholder
// hints at the active context but doesn't prefill or scope — the
// thread stays the general one. Users wanting goal-scoped chats still
// use the inline picker on /today.

import { useCallback, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Dialog } from '@/components/ui/dialog';
import {
  MisterPChatCard,
  type ChatMessage,
  type JourneyOption,
} from '@/app/(app)/today/mister-p-chat-card';

const GENERAL_KEY = '__general__';

type Props = {
  initialGeneralThread: ChatMessage[];
};

// Best-effort mapping of /plan/<topic> paths to a human-readable
// label for the placeholder hint. Anything not on this list opens
// the modal without a topic-specific hint.
const TOPIC_LABELS: Record<string, string> = {
  hair: 'hair',
  style: 'style',
  facial_hair: 'facial hair',
  'facial-hair': 'facial hair',
  nutrition: 'nutrition',
  strength: 'strength',
  cardio: 'cardio',
  sleep: 'sleep',
  skincare: 'skincare',
  glp1: 'GLP-1',
  trt: 'TRT',
};

function topicHintFromPath(pathname: string): string | null {
  const match = pathname.match(/^\/plan\/([^/]+)/);
  if (!match) return null;
  return TOPIC_LABELS[match[1]] ?? null;
}

export function MisterPLauncher({ initialGeneralThread }: Props) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname() ?? '';
  const topicHint = topicHintFromPath(pathname);

  // Cmd/Ctrl+K to open. Bound once at the launcher level, not in a
  // layout effect — the launcher mounts inside every (app) page so
  // this is the right scope.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const close = useCallback(() => setOpen(false), []);

  // Empty journeys array: the launcher is for ambient unscoped
  // access. Journey-scoped chats still live on /today and
  // journey-specific pages; the launcher modal is deliberately
  // one-thread to keep the surface-light promise (ambient access,
  // not a parallel inbox).
  const journeys: JourneyOption[] = [];
  const initialThreads: Record<string, ChatMessage[]> = {
    [GENERAL_KEY]: initialGeneralThread,
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center rounded-md border border-zinc-300 bg-white px-2.5 py-1 text-xs text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-800"
        aria-label="Ask Mister P"
        title="Ask Mister P (Ctrl+K)"
      >
        Ask Mister P
      </button>

      <Dialog
        open={open}
        onClose={close}
        ariaLabel="Ask Mister P"
        maxWidthClass="max-w-3xl"
      >
        <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-3 dark:border-zinc-800">
          <p className="text-[12px] uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            {topicHint
              ? `Asking from /plan/${topicHint.replace(' ', '-')}`
              : 'Ambient chat'}
          </p>
          <button
            type="button"
            onClick={close}
            className="rounded-md px-2 py-1 text-xs text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
            aria-label="Close"
          >
            Close · Esc
          </button>
        </div>
        <div className="px-1 py-1">
          {/* MisterPChatCard renders its own card chrome — strip the
              outer padding here so the modal frame doesn't compound
              the spacing. */}
          <MisterPChatCard journeys={journeys} initialThreads={initialThreads} />
        </div>
      </Dialog>
    </>
  );
}
