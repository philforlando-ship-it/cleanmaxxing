// Quick-prompt chips that hand the user off to /chat with a pre-filled
// question in the right journey-scoped thread. Sit above each section
// on /photos so users don't have to type the same 4 questions to read
// progress.
//
// The thread slug must match a JOURNEY slug from lib/today/journeys.ts
// (the chat-card picker only mounts threads for the user's available
// journeys). The 'general' sentinel routes to the unscoped chat.

import Link from 'next/link';

export type ChatChipCategory = 'face' | 'body' | 'hair' | 'fit';

type Chip = {
  // User-visible chip label
  label: string;
  // Text pre-filled into the chat input (user can edit before sending)
  prompt: string;
  // Journey slug the chat card switches to. 'general' for the
  // unscoped thread. Must match a key the user actually has — if the
  // user hasn't picked the matching journey, /chat falls back to
  // General silently.
  thread: string;
};

const CHIPS_BY_CATEGORY: Record<ChatChipCategory, ReadonlyArray<Chip>> = {
  face: [
    {
      label: 'How do I look today?',
      prompt: 'How do I look in my most recent face photo compared to baseline?',
      thread: 'facial_structure',
    },
    {
      label: 'Has my face leaned out?',
      prompt: 'Has my face leaned out since baseline? Compare my baseline face photo to my most recent one.',
      thread: 'facial_structure',
    },
    {
      label: 'What changed in my face?',
      prompt: 'What specifically has changed in my face between my baseline photo and my most recent one?',
      thread: 'facial_structure',
    },
  ],
  body: [
    {
      label: 'Am I leaner than baseline?',
      prompt: 'Am I visibly leaner than my baseline body photo? Read both shots and tell me what you see.',
      thread: 'body_composition',
    },
    {
      label: 'Is training showing yet?',
      prompt: 'Comparing my baseline body photo to the most recent one — is the training starting to show?',
      thread: 'strength',
    },
  ],
  hair: [
    {
      label: 'Is my hairline stable?',
      prompt: 'Compare my latest hair photo to my baseline — is my hairline holding steady or has it changed?',
      thread: 'hair',
    },
    {
      label: 'Has density changed?',
      prompt: 'Has my overall hair density changed between my baseline and most recent hair photo?',
      thread: 'hair',
    },
  ],
  fit: [
    {
      label: 'How does this fit look?',
      prompt: 'How does the outfit in my latest fit photo look? Anything to call out on proportions or sleeve / shoulder fit?',
      thread: 'style',
    },
    {
      label: 'Anything off about this?',
      prompt: 'Is there anything off about my latest fit photo — fit, proportions, color, layering?',
      thread: 'style',
    },
  ],
};

export function MisterPChips({ category }: { category: ChatChipCategory }) {
  const chips = CHIPS_BY_CATEGORY[category];
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {chips.map((chip) => {
        const href = `/chat?prefill=${encodeURIComponent(chip.prompt)}&thread=${encodeURIComponent(chip.thread)}`;
        return (
          <Link
            key={chip.label}
            href={href}
            className="inline-flex items-center rounded-full border border-zinc-300 bg-white px-3 py-1.5 text-[12px] font-medium text-zinc-700 transition hover:border-zinc-400 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-zinc-600 dark:hover:bg-zinc-800"
          >
            {chip.label}
          </Link>
        );
      })}
    </div>
  );
}
