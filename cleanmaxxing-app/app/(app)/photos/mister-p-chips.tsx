// Per-category chip row that sits under each section on /photos.
// Two kinds of chips, both rendered in the same row but visually
// distinct:
//
//   1. Mister P prompt chips (bordered) — hand the user off to /chat
//      with a pre-filled question in the right journey-scoped thread.
//   2. A journey-link chip (filled) — navigates the user directly to
//      the relevant /plan/<journey> page. Different intent: "do the
//      work" vs the prompt chips' "ask about the work."
//
// The thread slug on prompt chips must match a JOURNEY slug from
// lib/today/journeys.ts (the chat-card picker only mounts threads for
// the user's available journeys). The 'general' sentinel routes to
// the unscoped chat.

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

// Per-category journey link — the "go to the plan" side of the row.
// One link per photo category. Maps to whichever journey owns that
// photo type. body→nutrition because body composition lives on
// /plan/nutrition (see lib/today/journeys.ts: body_composition's
// planPath).
type JourneyLink = {
  label: string;
  href: string;
};

const JOURNEY_BY_CATEGORY: Record<ChatChipCategory, JourneyLink> = {
  face: { label: 'Facial structure plan →', href: '/plan/facial-structure' },
  body: { label: 'Nutrition plan →', href: '/plan/nutrition' },
  hair: { label: 'Hair plan →', href: '/plan/hair' },
  fit: { label: 'Style plan →', href: '/plan/style' },
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

export function MisterPChips({
  category,
  isPremium,
}: {
  category: ChatChipCategory;
  isPremium: boolean;
}) {
  const chips = CHIPS_BY_CATEGORY[category];
  const journey = JOURNEY_BY_CATEGORY[category];
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      {/* "Pro" pill leads the row when the user is free — sets honest
          expectations that the Mister P prompt chips will land in
          chat WITHOUT photo attachment (Mister P attaches photos for
          Pro users only). The journey-link chip at the end of the
          row is NOT Pro-gated — it just navigates to the plan page,
          so the pill applies to the prompt chips, not the journey
          chip. */}
      {!isPremium && (
        <span className="inline-flex items-center rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
          Pro
        </span>
      )}
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
      {/* Journey-link chip — visually distinct (filled background,
          no border) so the "navigate to the plan" intent reads
          differently from the "ask Mister P" prompt chips. */}
      <Link
        href={journey.href}
        className="inline-flex items-center rounded-full bg-zinc-900 px-3 py-1.5 text-[12px] font-medium text-white transition hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        {journey.label}
      </Link>
    </div>
  );
}
