'use client';

// Shared streaming preview panel — used by every Pattern A assessment
// form while the LLM plan is streaming in. Bridges the gap between
// "form submitted" and "fully-rendered markdown report on /plan/<x>".
// Plain whitespace-pre-wrap render with a pulsing cursor; the rendered
// markdown view loads once the stream closes + router.refresh fires.
//
// Voice posture: matches the rest of the app — "Mister P is writing"
// not "AI is generating." Direct, no fluff.

type Props = {
  // Accumulating text as tokens arrive. Empty string is a valid
  // initial state (cursor shows alone).
  text: string;
};

export function StreamingPlanPreview({ text }: Props) {
  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
      <header>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          Mister P is writing your plan
        </p>
        <h2 className="mt-1 text-lg font-medium text-zinc-900 dark:text-zinc-100">
          Plan generating…
        </h2>
      </header>
      <div className="mt-4 max-h-[60vh] overflow-y-auto rounded-md border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950">
        <pre className="whitespace-pre-wrap font-serif text-[14px] leading-relaxed text-zinc-800 dark:text-zinc-200">
          {text || ' '}
          <span className="ml-0.5 inline-block h-4 w-[2px] animate-pulse bg-zinc-400 align-middle" />
        </pre>
      </div>
      <p className="mt-3 text-[12px] text-zinc-500 dark:text-zinc-400">
        Rendered view loads once the plan finishes.
      </p>
    </section>
  );
}

// Helper for the form's submit handler — reads a text/plain stream
// response body into a setter that the StreamingPlanPreview consumes.
// Throws on transport errors mid-stream so the form's catch block
// surfaces them to the user.
export async function consumeTextStream(
  res: Response,
  setText: (s: string) => void,
): Promise<void> {
  if (!res.body) {
    throw new Error('No response body — try again from the plan page.');
  }
  setText('');
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let acc = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    acc += decoder.decode(value, { stream: true });
    setText(acc);
  }
}
