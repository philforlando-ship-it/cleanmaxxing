'use client';

// PhotoTimelinePanel — chronological photo timeline + click-to-compare.
// Pairs L2 (timeline view) and C1 (compare-any-two): the timeline IS
// the picker. Tap one tile to mark "A", tap a second to mark "B", and
// the side-by-side comparison renders below. Tapping a third resets B.
// Visual-only comparison — no AI; the existing facial-analysis surface
// is the AI-mediated path and remains slot-restricted (baseline / 30d /
// 90d / 180d). This panel covers the gaps facial-analysis can't: hair
// sessions, body photos (never sent to AI), and arbitrary-pair compare.

import { useMemo, useState } from 'react';

export type TimelineItem = {
  id: string;
  signedUrl: string;
  // Display label like "Face baseline / front" or "Hair session / front"
  label: string;
  // Sub-label for finer-grain context (e.g. session notes for hair, slot
  // detail for face/body). Optional.
  detail?: string | null;
  // ISO timestamp — used for ordering and the chip label.
  capturedAt: string;
  kind: 'face' | 'body' | 'hair';
};

type Props = {
  items: TimelineItem[];
  timezone: string;
};

const KIND_BADGE: Record<TimelineItem['kind'], string> = {
  face: 'Face',
  body: 'Body',
  hair: 'Hair',
};

const KIND_BADGE_CLASS: Record<TimelineItem['kind'], string> = {
  face: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
  body: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
  hair: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
};

function formatDate(iso: string, timezone: string): string {
  try {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date(iso));
  } catch {
    return iso.slice(0, 10);
  }
}

export function PhotoTimelinePanel({ items, timezone }: Props) {
  const sorted = useMemo(
    () =>
      [...items].sort(
        (a, b) =>
          new Date(b.capturedAt).getTime() - new Date(a.capturedAt).getTime(),
      ),
    [items],
  );

  const [aId, setAId] = useState<string | null>(null);
  const [bId, setBId] = useState<string | null>(null);

  function onTileClick(id: string) {
    if (aId === id) {
      setAId(null);
      return;
    }
    if (bId === id) {
      setBId(null);
      return;
    }
    if (!aId) {
      setAId(id);
      return;
    }
    if (!bId) {
      setBId(id);
      return;
    }
    // Both occupied — replace B with the new pick (most recent action wins).
    setBId(id);
  }

  const a = aId ? sorted.find((i) => i.id === aId) ?? null : null;
  const b = bId ? sorted.find((i) => i.id === bId) ?? null : null;

  // Order so the OLDER of the two appears on the left. If only one is
  // selected, leave it on the left.
  const [left, right] = useMemo(() => {
    if (!a || !b) return [a ?? b, null] as const;
    const aTime = new Date(a.capturedAt).getTime();
    const bTime = new Date(b.capturedAt).getTime();
    return aTime <= bTime ? ([a, b] as const) : ([b, a] as const);
  }, [a, b]);

  function clearSelection() {
    setAId(null);
    setBId(null);
  }

  if (sorted.length === 0) {
    return (
      <section>
        <h2 className="text-base font-medium text-zinc-900 dark:text-zinc-100">
          Timeline
        </h2>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Once you’ve captured a few photos, they’ll appear here in date
          order. Tap any two to see them side-by-side.
        </p>
      </section>
    );
  }

  return (
    <section>
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-base font-medium text-zinc-900 dark:text-zinc-100">
          Timeline
        </h2>
        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          {sorted.length} {sorted.length === 1 ? 'photo' : 'photos'}
        </span>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
        Tap any two to compare side-by-side. Face, body, and hair photos
        all show up here in date order — no slot restrictions.
      </p>

      {(a || b) && (
        <div className="mt-5 rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950/60">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-[12px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              {a && b ? 'Comparison' : 'Selected'}
            </p>
            <button
              type="button"
              onClick={clearSelection}
              className="text-[12px] text-zinc-500 underline decoration-dotted underline-offset-2 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            >
              Clear
            </button>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <ComparePane item={left} timezone={timezone} side="A" />
            <ComparePane item={right} timezone={timezone} side="B" />
          </div>
          {a && b && (
            <p className="mt-3 text-[12px] leading-snug text-zinc-600 dark:text-zinc-400">
              Differences in lighting, distance, or angle can read as
              progress — or hide it. Trust the trend across multiple
              honest captures, not any single side-by-side.
            </p>
          )}
        </div>
      )}

      <ul className="mt-6 grid grid-cols-3 gap-3 sm:grid-cols-4">
        {sorted.map((item) => {
          const isA = aId === item.id;
          const isB = bId === item.id;
          const selected = isA || isB;
          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => onTileClick(item.id)}
                className={`group relative block w-full overflow-hidden rounded-lg border text-left transition ${
                  selected
                    ? 'border-zinc-900 ring-2 ring-zinc-900 dark:border-zinc-100 dark:ring-zinc-100'
                    : 'border-zinc-200 hover:border-zinc-400 dark:border-zinc-800 dark:hover:border-zinc-600'
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.signedUrl}
                  alt={item.label}
                  className="aspect-square w-full object-cover"
                />
                {selected && (
                  <span className="absolute left-2 top-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-zinc-900 text-[11px] font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900">
                    {isA ? 'A' : 'B'}
                  </span>
                )}
                <div className="bg-white p-2 dark:bg-zinc-900">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`inline-flex rounded px-1.5 py-0.5 text-[10px] font-medium ${KIND_BADGE_CLASS[item.kind]}`}
                    >
                      {KIND_BADGE[item.kind]}
                    </span>
                    <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                      {formatDate(item.capturedAt, timezone)}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-[12px] text-zinc-700 dark:text-zinc-300">
                    {item.label}
                  </p>
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function ComparePane({
  item,
  timezone,
  side,
}: {
  item: TimelineItem | null;
  timezone: string;
  side: 'A' | 'B';
}) {
  if (!item) {
    return (
      <div className="flex aspect-square w-full items-center justify-center rounded-md border border-dashed border-zinc-300 text-[12px] text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
        Pick a second photo
      </div>
    );
  }
  return (
    <div>
      <div className="overflow-hidden rounded-md border border-zinc-200 dark:border-zinc-800">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.signedUrl}
          alt={item.label}
          className="aspect-square w-full object-cover"
        />
      </div>
      <div className="mt-2">
        <div className="flex items-center gap-1.5">
          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-zinc-900 text-[10px] font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900">
            {side}
          </span>
          <span
            className={`inline-flex rounded px-1.5 py-0.5 text-[10px] font-medium ${KIND_BADGE_CLASS[item.kind]}`}
          >
            {KIND_BADGE[item.kind]}
          </span>
          <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
            {formatDate(item.capturedAt, timezone)}
          </span>
        </div>
        <p className="mt-1 truncate text-[12px] text-zinc-700 dark:text-zinc-300">
          {item.label}
        </p>
        {item.detail && (
          <p className="mt-0.5 truncate text-[11px] text-zinc-500 dark:text-zinc-400">
            {item.detail}
          </p>
        )}
      </div>
    </div>
  );
}
