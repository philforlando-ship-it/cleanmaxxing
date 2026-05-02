'use client';

// "Ask Mister P about this phase" button on each Current Focus entry.
// Pre-fills a question scoped to the goal's chat thread that names
// the current phase + focus, then dispatches the same `mister-p:prefill`
// event the daily check-in uses. The chat card's listener routes the
// question into the matching goal's thread (not General) and scrolls
// the chat into view, so the user lands at an answer rather than at
// an empty input box.

type Props = {
  goalId: string;
  goalTitle: string;
  phaseLabel: string;
  phaseFocus: string | null;
  graduated: boolean;
};

export function AskAboutPhaseButton({
  goalId,
  goalTitle,
  phaseLabel,
  phaseFocus,
  graduated,
}: Props) {
  function ask() {
    const question = graduated
      ? `I've finished the walkthrough for "${goalTitle}." What does staying on this look like long-term, and what's the next layer worth adding?`
      : phaseFocus
        ? `I'm in phase ${phaseLabel} of "${goalTitle}" — focus is "${phaseFocus}." What should I be paying most attention to right now, and what's the most common thing that trips people up at this stage?`
        : `I'm in phase ${phaseLabel} of "${goalTitle}." What should I be paying most attention to right now, and what's the most common thing that trips people up at this stage?`;
    window.dispatchEvent(
      new CustomEvent('mister-p:prefill', { detail: { question, goalId } }),
    );
  }

  return (
    <button
      type="button"
      onClick={ask}
      className="text-xs font-medium text-zinc-700 underline decoration-dotted underline-offset-2 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100"
    >
      Ask Mister P about this phase →
    </button>
  );
}
