'use client';

import { useState } from 'react';
import { tierExplainer, tierLabel } from '@/lib/goals/tier';

type Props = {
  tier: string | null | undefined;
};

/**
 * Renders a priority-tier pill (e.g. "Foundation"). Tapping it toggles a
 * small inline explainer below so users can learn what the tier means
 * without leaving the page. Returns null when the tier is unknown/empty.
 *
 * The pill uses stopPropagation so it works inside parent click targets
 * (e.g. a goal card that opens details on tap) without hijacking the outer
 * click.
 */
export function TierBadge({ tier }: Props) {
  const [open, setOpen] = useState(false);
  const label = tierLabel(tier);
  const explainer = tierExplainer(tier);
  if (!label) return null;

  return (
    <span className="relative inline-flex items-center">
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!explainer) return;
          setOpen((v) => !v);
        }}
        aria-expanded={open}
        className={`rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 transition dark:bg-zinc-800 dark:text-zinc-400 ${
          explainer ? 'cursor-help hover:bg-zinc-200 dark:hover:bg-zinc-700' : ''
        }`}
      >
        {label}
      </button>
      {open && explainer && (
        <span
          role="tooltip"
          className="absolute left-0 top-full z-20 mt-1 w-64 rounded-md border border-zinc-200 bg-white p-2.5 text-xs leading-snug text-zinc-700 shadow-md dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
        >
          {explainer}
        </span>
      )}
    </span>
  );
}
