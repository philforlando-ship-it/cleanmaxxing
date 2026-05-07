// Phase E of the /today redesign — Area 2 contextual prompt.
//
// Renders zero or one prompt. When `prompt` is null, returns
// null — empty Area 2 is better than filler per the design spec.
//
// No CTA button. Area 2 is a *prompt*, not an action. The user
// reflects, or doesn't.
//
// Subtle styling: lighter weight than Area 1, no accent borders,
// no emphasis colors. Quietly observational.

import type { ContextualPrompt } from '@/lib/contextual-prompt/types';

type Props = {
  prompt: ContextualPrompt | null;
};

export function ContextualPromptCard({ prompt }: Props) {
  if (!prompt) return null;
  return (
    <section className="rounded-lg border border-zinc-200 bg-zinc-50/50 px-5 py-4 dark:border-zinc-800 dark:bg-zinc-900/40">
      <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
        {prompt.title}
      </p>
      <p className="mt-1.5 text-[13px] leading-relaxed text-zinc-600 dark:text-zinc-400">
        {prompt.body}
      </p>
    </section>
  );
}
