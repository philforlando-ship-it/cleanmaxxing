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

import Link from 'next/link';
import { LightbulbIcon } from '@phosphor-icons/react/ssr';
import { TileIcon } from './tile-icon';
import type { ContextualPrompt } from '@/lib/contextual-prompt/types';

type Props = {
  prompt: ContextualPrompt | null;
  // I1 — when prompt.kind === 'cross_journey_dependency' AND the
  // user is on the free tier, render a small ceiling-hint link to
  // /pricing so the cross-journey architecture is perceptible
  // without being salesy. Pro users see the same prompt copy with
  // no hint. Optional so legacy call sites (tests, other routes)
  // don't break.
  isPremium?: boolean;
};

export function ContextualPromptCard({ prompt, isPremium = true }: Props) {
  if (!prompt) return null;

  const showCeilingHint =
    !isPremium && prompt.kind === 'cross_journey_dependency';

  return (
    <section className="rounded-lg border border-zinc-200 bg-zinc-50/50 px-5 py-4 dark:border-zinc-800 dark:bg-zinc-900/40">
      <div className="flex items-start gap-3">
        <TileIcon icon={LightbulbIcon} tone="violet" compact />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
            {prompt.title}
          </p>
          <p className="mt-1.5 text-[13px] leading-relaxed text-zinc-600 dark:text-zinc-400">
            {prompt.body}
          </p>
          {showCeilingHint && (
            <p className="mt-2.5 text-[12px] text-zinc-500 dark:text-zinc-500">
              <Link
                href="/pricing"
                className="underline decoration-dotted underline-offset-2 hover:text-zinc-700 dark:hover:text-zinc-300"
              >
                How cross-journey signals work →
              </Link>
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
