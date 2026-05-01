// Sunday letter from Mister P. The cron generates one row per
// week; this card renders the most recent letter for the rest
// of the week. Plain prose only — splits on blank lines into
// paragraphs so the LLM's natural paragraph breaks come through
// without requiring markdown.

type Props = {
  weekStart: string;
  body: string;
};

function formatWeekLabel(weekStartIso: string): string {
  const [y, m, d] = weekStartIso.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

export function WeeklyLetterCard({ weekStart, body }: Props) {
  const paragraphs = body
    .split(/\n{2,}/)
    .map((p) => p.replace(/\n/g, ' ').trim())
    .filter(Boolean);

  return (
    <section className="rounded-xl border border-zinc-200 bg-zinc-50 px-6 py-5 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          From Mister P
        </h2>
        <span className="text-xs text-zinc-500 dark:text-zinc-500">
          Week of {formatWeekLabel(weekStart)}
        </span>
      </div>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-zinc-800 dark:text-zinc-200">
        {paragraphs.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>
    </section>
  );
}
