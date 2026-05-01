'use client';

// Custom goal form. Lives at the top of /goals/library above the
// templated browser. The user types their own title + description
// but is required to pick a "closest POV" — that anchor is what
// lets Mister P calibrate his answers (focus embedding, slug
// bonus, retrieval bias all key on source_slug). Without an
// anchor, custom goals would degrade Mister P to generic
// retrieval; the picker is the dignity tradeoff that preserves
// the spine.
//
// Categories from /api/goals/templates' POV docs feed the
// grouped <optgroup>; the user picks a category visually, then
// a specific POV within it. Priority tier and category get
// derived server-side from the chosen slug, so the client only
// has to send slug + title + description + goal_type + baseline.

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

export type PovChoice = {
  slug: string;
  title: string;
  category: string;
};

const CATEGORY_LABELS: Record<string, string> = {
  'biological-foundation': 'Biological Foundation',
  'structural-framing': 'Structural & Framing',
  'grooming-refinement': 'Grooming & Refinement',
  'behavioral-aesthetics': 'Behavioral',
  'perception-identity': 'Perception & Identity',
  'safety': 'Self-acceptance',
};

type BaselineStage = 'new' | 'light' | 'partial' | 'established';

const BASELINE_OPTIONS: Array<{ value: BaselineStage; label: string }> = [
  { value: 'new', label: 'Just starting' },
  { value: 'light', label: 'Some experience' },
  { value: 'partial', label: 'Mostly consistent' },
  { value: 'established', label: 'Already consistent' },
];

type Props = {
  povs: PovChoice[];
};

export function CustomGoalForm({ povs }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [sourceSlug, setSourceSlug] = useState('');
  const [goalType, setGoalType] = useState<'process' | 'outcome'>('process');
  const [baseline, setBaseline] = useState<BaselineStage>('new');
  const [targetMode, setTargetMode] = useState<'none' | 'date' | 'weeks'>(
    'none',
  );
  const [targetDate, setTargetDate] = useState('');
  const [targetWeeks, setTargetWeeks] = useState('');
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Group POVs by category for the <optgroup>-style picker.
  // Within each group, sort alphabetically by title.
  const grouped = useMemo(() => {
    const map = new Map<string, PovChoice[]>();
    for (const p of povs) {
      const list = map.get(p.category) ?? [];
      list.push(p);
      map.set(p.category, list);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(
        ([cat, list]) =>
          [
            cat,
            list.sort((a, b) => a.title.localeCompare(b.title)),
          ] as const,
      );
  }, [povs]);

  function reset() {
    setTitle('');
    setDescription('');
    setSourceSlug('');
    setGoalType('process');
    setBaseline('new');
    setTargetMode('none');
    setTargetDate('');
    setTargetWeeks('');
    setError(null);
  }

  // Compute the YYYY-MM-DD payload value from whichever input
  // mode the user picked. Returns '' for "none" and an error
  // string when the input is bad — caller surfaces it to the user.
  function resolveTarget(): { value: string | null; error: string | null } {
    if (targetMode === 'none') return { value: null, error: null };
    if (targetMode === 'date') {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(targetDate)) {
        return { value: null, error: 'Pick a valid date.' };
      }
      return { value: targetDate, error: null };
    }
    // 'weeks' mode — convert N weeks from today to a date.
    const n = Number(targetWeeks);
    if (!Number.isFinite(n) || n < 1 || n > 104) {
      return { value: null, error: 'Weeks must be between 1 and 104.' };
    }
    const d = new Date();
    d.setDate(d.getDate() + Math.round(n) * 7);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return { value: `${y}-${m}-${dd}`, error: null };
  }

  function submit() {
    setError(null);
    if (title.trim().length === 0) {
      setError('Title is required.');
      return;
    }
    if (!sourceSlug) {
      setError('Pick a closest POV — Mister P uses it to calibrate answers.');
      return;
    }

    const target = resolveTarget();
    if (target.error) {
      setError(target.error);
      return;
    }

    startTransition(async () => {
      try {
        const res = await fetch('/api/goals/add', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            title: title.trim(),
            description: description.trim() || undefined,
            source_slug: sourceSlug,
            goal_type: goalType,
            baseline_stage: baseline,
            source: 'user_created',
            target_date: target.value,
          }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          if (body.error === 'goal_limit_reached') {
            setError(
              `You're at the active goal cap (${body.cap}). Complete or abandon one before adding another.`,
            );
            return;
          }
          if (body.error === 'Already active.') {
            setError(
              "You already have an active goal anchored to that POV. Pick a different one or finish the existing goal first.",
            );
            return;
          }
          throw new Error(body.error ?? `Add failed (${res.status})`);
        }
        reset();
        setOpen(false);
        router.refresh();
      } catch (err) {
        setError((err as Error).message);
      }
    });
  }

  if (!open) {
    return (
      <div className="mt-8">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          + Add a custom goal
        </button>
      </div>
    );
  }

  return (
    <section className="mt-8 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-semibold tracking-tight">Custom goal</h2>
        <button
          type="button"
          onClick={() => {
            reset();
            setOpen(false);
          }}
          disabled={pending}
          className="text-xs text-zinc-500 underline dark:text-zinc-400"
        >
          Cancel
        </button>
      </div>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        Type your own goal, then pick the closest POV in the corpus &mdash;
        Mister P uses it as the anchor for calibrated answers. If nothing in
        the picker fits, that&rsquo;s useful signal; tell me and I&rsquo;ll add
        a POV for it.
      </p>

      <div className="mt-6 space-y-5">
        <div>
          <label
            htmlFor="custom-title"
            className="block text-sm font-medium text-zinc-900 dark:text-zinc-100"
          >
            Title
          </label>
          <input
            id="custom-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={pending}
            maxLength={200}
            placeholder="What you want to accomplish, in your own words"
            className="mt-2 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
        </div>

        <div>
          <label
            htmlFor="custom-description"
            className="block text-sm font-medium text-zinc-900 dark:text-zinc-100"
          >
            Description{' '}
            <span className="text-xs font-normal text-zinc-500">(optional)</span>
          </label>
          <textarea
            id="custom-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={pending}
            maxLength={500}
            rows={2}
            placeholder="Specifics, target, anything that shapes what 'done' looks like"
            className="mt-2 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
        </div>

        <div>
          <label
            htmlFor="custom-pov"
            className="block text-sm font-medium text-zinc-900 dark:text-zinc-100"
          >
            Closest POV
          </label>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            The POV doc Mister P should bias toward when answering questions
            about this goal.
          </p>
          <select
            id="custom-pov"
            value={sourceSlug}
            onChange={(e) => setSourceSlug(e.target.value)}
            disabled={pending}
            className="mt-2 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          >
            <option value="">— Pick a POV —</option>
            {grouped.map(([cat, list]) => (
              <optgroup key={cat} label={CATEGORY_LABELS[cat] ?? cat}>
                {list.map((p) => (
                  <option key={p.slug} value={p.slug}>
                    {p.title}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        <div>
          <span className="block text-sm font-medium text-zinc-900 dark:text-zinc-100">
            Goal type
          </span>
          <div className="mt-2 flex gap-2">
            {(['process', 'outcome'] as const).map((opt) => {
              const selected = goalType === opt;
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setGoalType(opt)}
                  disabled={pending}
                  className={
                    selected
                      ? 'rounded-full bg-zinc-900 px-3.5 py-1.5 text-xs font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900'
                      : 'rounded-full border border-zinc-300 px-3.5 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800'
                  }
                >
                  {opt === 'process' ? 'Process (habit)' : 'Outcome (target)'}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label
            htmlFor="custom-baseline"
            className="block text-sm font-medium text-zinc-900 dark:text-zinc-100"
          >
            How much of this are you already doing?
          </label>
          <select
            id="custom-baseline"
            value={baseline}
            onChange={(e) => setBaseline(e.target.value as BaselineStage)}
            disabled={pending}
            className="mt-2 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          >
            {BASELINE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <span className="block text-sm font-medium text-zinc-900 dark:text-zinc-100">
            Finishline{' '}
            <span className="text-xs font-normal text-zinc-500">(optional)</span>
          </span>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Sets a "Week N of M" surface on /today. Leave open-ended if
            you don&rsquo;t want one.
          </p>
          <div className="mt-2 flex gap-2">
            {(['none', 'date', 'weeks'] as const).map((mode) => {
              const selected = targetMode === mode;
              const label =
                mode === 'none'
                  ? 'Open-ended'
                  : mode === 'date'
                    ? 'By date'
                    : 'For N weeks';
              return (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setTargetMode(mode)}
                  disabled={pending}
                  className={
                    selected
                      ? 'rounded-full bg-zinc-900 px-3.5 py-1.5 text-xs font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900'
                      : 'rounded-full border border-zinc-300 px-3.5 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800'
                  }
                >
                  {label}
                </button>
              );
            })}
          </div>
          {targetMode === 'date' && (
            <input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              disabled={pending}
              className="mt-3 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
          )}
          {targetMode === 'weeks' && (
            <div className="mt-3 flex items-center gap-2">
              <input
                type="number"
                min={1}
                max={104}
                step={1}
                value={targetWeeks}
                onChange={(e) => setTargetWeeks(e.target.value)}
                disabled={pending}
                placeholder="e.g. 8"
                className="w-24 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              />
              <span className="text-xs text-zinc-500">weeks from today</span>
            </div>
          )}
        </div>

        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={submit}
            disabled={pending}
            className="rounded-lg bg-zinc-900 px-5 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            {pending ? 'Adding…' : 'Add this goal'}
          </button>
        </div>
      </div>
    </section>
  );
}
