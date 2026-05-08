// Native <details> expander used inside the daily-targets card on
// /plan/nutrition. Server component — no client JS needed; the
// browser handles the open/close state.
//
// Each instance shows a "Why this number?" trigger that expands to a
// short list of bullet lines walking through the math.

type Props = {
  lines: string[] | null;
  // Trigger label override — defaults to "Why this number?"
  label?: string;
};

export function WhyThisNumber({ lines, label }: Props) {
  if (!lines || lines.length === 0) return null;
  return (
    <details className="group mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
      <summary className="cursor-pointer list-none underline decoration-dotted underline-offset-2 hover:text-zinc-700 dark:hover:text-zinc-300">
        {label ?? 'Why this number?'}
      </summary>
      <ul className="mt-1.5 space-y-1 pl-3 leading-relaxed text-zinc-600 dark:text-zinc-400">
        {lines.map((line, i) => (
          <li key={i} className="flex gap-1.5">
            <span className="text-zinc-400">·</span>
            <span>{line}</span>
          </li>
        ))}
      </ul>
    </details>
  );
}
