// Native <details> expander for "Why this <thing>?" inline rationale.
// Server component — no client JS needed; the browser owns open/close.
//
// Used by /plan/nutrition's daily-targets card ("Why this number?")
// and /plan/sleep's commitment list ("Why this commitment?"), with
// the label overridable per-instance. Lives in components/ so any
// surface that wants to surface its math can grab the same primitive
// without importing across journey directories.

type Props = {
  lines: string[] | null;
  // Trigger label. Defaults to "Why this?" — surface-specific values
  // (e.g. "Why this number?", "Why this commitment?") should be passed
  // explicitly so the affordance reads naturally in context.
  label?: string;
};

export function WhyThis({ lines, label }: Props) {
  if (!lines || lines.length === 0) return null;
  return (
    <details className="group mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
      <summary className="cursor-pointer list-none underline decoration-dotted underline-offset-2 hover:text-zinc-700 dark:hover:text-zinc-300">
        {label ?? 'Why this?'}
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
