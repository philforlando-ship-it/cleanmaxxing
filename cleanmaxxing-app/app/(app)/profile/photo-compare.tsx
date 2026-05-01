'use client';

// Side-by-side + slider overlay comparison for any two captured
// progress photos. Defaults to baseline vs. most recent. Two
// modes: a flat 2-up view (always available, useful for thumbnail
// scanning) and a draggable slider overlay (the iconic
// before/after UX, useful when the photos are reasonably aligned).
// Mode persists in component state for the session — not
// localStorage, since there's no need to make a UX preference
// sticky here.

import { useMemo, useRef, useState } from 'react';

type Slot = 'baseline' | 'progress_30d' | 'progress_90d' | 'progress_180d';

type Photo = {
  slot: Slot;
  captured_at: string;
  signedUrl: string;
};

type Props = {
  photos: Photo[];
};

const SLOT_LABEL: Record<Slot, string> = {
  baseline: 'Baseline',
  progress_30d: '30-day',
  progress_90d: '90-day',
  progress_180d: '180-day',
};

const SLOT_ORDER: Slot[] = [
  'baseline',
  'progress_30d',
  'progress_90d',
  'progress_180d',
];

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function PhotoCompare({ photos }: Props) {
  // Photos come in unspecified order from the server query; sort
  // by canonical slot order so the picker dropdowns read
  // chronologically and the default left/right pick reflects
  // earliest vs. latest.
  const sorted = useMemo(() => {
    const indexFor = (s: Slot) => SLOT_ORDER.indexOf(s);
    return [...photos].sort((a, b) => indexFor(a.slot) - indexFor(b.slot));
  }, [photos]);

  const [leftSlot, setLeftSlot] = useState<Slot>(sorted[0].slot);
  const [rightSlot, setRightSlot] = useState<Slot>(
    sorted[sorted.length - 1].slot,
  );
  const [mode, setMode] = useState<'side-by-side' | 'slider'>('side-by-side');

  const left = sorted.find((p) => p.slot === leftSlot) ?? sorted[0];
  const right =
    sorted.find((p) => p.slot === rightSlot) ?? sorted[sorted.length - 1];

  return (
    <section className="mt-10">
      <div className="flex items-baseline justify-between">
        <h2 className="text-xl font-semibold tracking-tight">Compare</h2>
        <div className="flex gap-1 rounded-lg border border-zinc-300 p-0.5 text-xs dark:border-zinc-700">
          <button
            type="button"
            onClick={() => setMode('side-by-side')}
            className={
              mode === 'side-by-side'
                ? 'rounded-md bg-zinc-900 px-2 py-1 font-medium text-white dark:bg-zinc-100 dark:text-zinc-900'
                : 'rounded-md px-2 py-1 text-zinc-600 dark:text-zinc-300'
            }
          >
            Side by side
          </button>
          <button
            type="button"
            onClick={() => setMode('slider')}
            className={
              mode === 'slider'
                ? 'rounded-md bg-zinc-900 px-2 py-1 font-medium text-white dark:bg-zinc-100 dark:text-zinc-900'
                : 'rounded-md px-2 py-1 text-zinc-600 dark:text-zinc-300'
            }
          >
            Slider
          </button>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <SlotPicker
          label="Left"
          value={leftSlot}
          options={sorted}
          onChange={setLeftSlot}
        />
        <SlotPicker
          label="Right"
          value={rightSlot}
          options={sorted}
          onChange={setRightSlot}
        />
      </div>

      {mode === 'side-by-side' ? (
        <SideBySide left={left} right={right} />
      ) : (
        <SliderCompare left={left} right={right} />
      )}
    </section>
  );
}

function SlotPicker({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: Slot;
  options: Photo[];
  onChange: (s: Slot) => void;
}) {
  return (
    <div>
      <label className="block text-xs text-zinc-600 dark:text-zinc-400">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as Slot)}
        className="mt-1.5 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
      >
        {options.map((p) => (
          <option key={p.slot} value={p.slot}>
            {SLOT_LABEL[p.slot]} · {formatDate(p.captured_at)}
          </option>
        ))}
      </select>
    </div>
  );
}

function SideBySide({ left, right }: { left: Photo; right: Photo }) {
  return (
    <div className="mt-5 grid gap-4 sm:grid-cols-2">
      <Caption photo={left}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={left.signedUrl}
          alt={SLOT_LABEL[left.slot]}
          className="w-full rounded-lg object-cover"
        />
      </Caption>
      <Caption photo={right}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={right.signedUrl}
          alt={SLOT_LABEL[right.slot]}
          className="w-full rounded-lg object-cover"
        />
      </Caption>
    </div>
  );
}

function Caption({
  photo,
  children,
}: {
  photo: Photo;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
        {SLOT_LABEL[photo.slot]} &middot; {formatDate(photo.captured_at)}
      </div>
      <div className="mt-2">{children}</div>
    </div>
  );
}

function SliderCompare({ left, right }: { left: Photo; right: Photo }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  // Position of the slider as a percentage from left (0) to right
  // (100). At 50, the user sees the left photo's left half and the
  // right photo's right half — the canonical before/after split.
  const [pos, setPos] = useState(50);

  function pctFromEvent(clientX: number): number {
    const el = containerRef.current;
    if (!el) return 50;
    const rect = el.getBoundingClientRect();
    const raw = ((clientX - rect.left) / rect.width) * 100;
    return Math.max(0, Math.min(100, raw));
  }

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    draggingRef.current = true;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    setPos(pctFromEvent(e.clientX));
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!draggingRef.current) return;
    setPos(pctFromEvent(e.clientX));
  }

  function handlePointerUp(e: React.PointerEvent<HTMLDivElement>) {
    draggingRef.current = false;
    (e.target as Element).releasePointerCapture?.(e.pointerId);
  }

  // Front image (the "left" photo, conceptually "before") is
  // clipped from the right edge so that as the slider moves
  // rightward, more of the before photo is revealed. clip-path
  // inset uses (top right bottom left) — we clip from the right
  // by (100 - pos)% so pos=100 reveals all, pos=0 hides all.
  const clipStyle = {
    clipPath: `inset(0 ${100 - pos}% 0 0)`,
    WebkitClipPath: `inset(0 ${100 - pos}% 0 0)`,
  } as React.CSSProperties;

  return (
    <div className="mt-5">
      <div
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className="relative w-full select-none overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-800"
        style={{ touchAction: 'none' }}
      >
        {/* Back layer — the "after" photo. Always fully visible. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={right.signedUrl}
          alt={SLOT_LABEL[right.slot]}
          className="block w-full"
          draggable={false}
        />
        {/* Front layer — the "before" photo, clipped from the right.
            Absolute-positioned over the back layer at identical size
            so the alignment matches when the user matches conditions
            between captures. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={left.signedUrl}
          alt={SLOT_LABEL[left.slot]}
          className="absolute inset-0 block h-full w-full object-cover"
          style={clipStyle}
          draggable={false}
        />

        {/* Slider handle: vertical line + circular grip in the
            middle. Pointer-events left on by default so the user
            can grab the line itself, but the parent container
            also handles pointer events for clicks anywhere on
            the image. */}
        <div
          className="pointer-events-none absolute inset-y-0 w-0.5 bg-white shadow-md"
          style={{ left: `${pos}%`, transform: 'translateX(-50%)' }}
        >
          <div className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white p-2 text-zinc-700 shadow-md">
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              aria-hidden
            >
              <path
                d="M5 3L1 7L5 11"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M9 3L13 7L9 11"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>

        {/* Corner labels so the user knows which photo is which. */}
        <div className="pointer-events-none absolute left-3 top-3 rounded-full bg-zinc-900/70 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider text-white">
          {SLOT_LABEL[left.slot]}
        </div>
        <div className="pointer-events-none absolute right-3 top-3 rounded-full bg-zinc-900/70 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider text-white">
          {SLOT_LABEL[right.slot]}
        </div>
      </div>
      <p className="mt-3 text-xs text-zinc-500">
        Drag the handle to compare. Works best when both photos were
        taken with the same lighting, angle, and distance.
      </p>
    </div>
  );
}
