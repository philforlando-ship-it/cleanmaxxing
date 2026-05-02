'use client';

// Client-side capture flow for a progress photo. Shows the consent
// copy, accepts a file from the camera (mobile) or file picker
// (desktop), previews it client-side before upload so the user can
// see what they're actually sending, and then POSTs to the upload
// API. No bytes leave the device until the user clicks Upload.

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

type Slot = 'baseline' | 'progress_30d' | 'progress_90d' | 'progress_180d';

type Props = {
  slot: Slot;
  // Signed URL of the user's baseline photo. When passed (i.e.,
  // for any non-baseline slot), the capture surface renders a
  // ghost overlay of the baseline at low opacity over the file
  // picker / preview so the user can match angle, distance, and
  // framing. Optional — baseline-slot captures pass null since
  // there's nothing to align against.
  baselineUrl?: string | null;
};

const SLOT_LABEL: Record<Slot, string> = {
  baseline: 'baseline',
  progress_30d: '30-day',
  progress_90d: '90-day',
  progress_180d: '180-day',
};

export function CapturePhoto({ slot, baselineUrl = null }: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showGhost, setShowGhost] = useState(true);
  const hasGhost = slot !== 'baseline' && Boolean(baselineUrl);

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    if (!f) return;
    setError(null);
    setFile(f);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(f));
  }

  function cancel() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null);
    setPreviewUrl(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = '';
  }

  async function upload() {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('slot', slot);
      const res = await fetch('/api/progress-photos/upload', {
        method: 'POST',
        body: form,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Upload failed (${res.status})`);
      }
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setFile(null);
      setPreviewUrl(null);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      {!previewUrl && (
        <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <h3 className="text-lg font-medium">
            Capture your {SLOT_LABEL[slot]} photo
          </h3>
          <div className="mt-3 space-y-2 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
            <p>
              One front-facing photo. Good lighting, neutral expression, no
              filter. You&rsquo;re capturing a reference point to compare
              against later — the photo itself is the evidence.
            </p>
            <p className="text-zinc-600 dark:text-zinc-400">
              JPEG, PNG, or WebP, up to 25 MB — higher resolution helps
              future analysis, so don&rsquo;t pre-compress. iPhone users:
              if upload fails, switch <em>Settings → Camera → Formats</em>{' '}
              to <strong>Most Compatible</strong> so photos save as JPEG.
            </p>
            {hasGhost && (
              <p className="text-zinc-600 dark:text-zinc-400">
                <strong>Match the baseline:</strong> after you pick the photo
                you&rsquo;ll see your baseline overlaid on the new one at low
                opacity. Same angle, same lighting, same distance is what
                makes the comparison honest.
              </p>
            )}
            <p className="text-zinc-600 dark:text-zinc-400">
              Stored privately in your account, visible only to you, accessed
              via short-lived signed URLs. <strong>No AI analysis.</strong>{' '}
              You can delete the photo any time from the corresponding card
              on this page.
            </p>
          </div>
          {hasGhost && baselineUrl && (
            <div className="mt-4">
              <p className="text-xs uppercase tracking-wider text-zinc-500">
                Baseline reference
              </p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={baselineUrl}
                alt="Baseline reference"
                className="mt-2 max-h-48 w-full rounded-lg object-contain opacity-60"
              />
            </div>
          )}
          <div className="mt-5">
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              capture="user"
              onChange={onPick}
              className="block w-full text-sm text-zinc-700 file:mr-4 file:rounded-lg file:border-0 file:bg-zinc-900 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-zinc-800 dark:text-zinc-300 dark:file:bg-zinc-100 dark:file:text-zinc-900"
            />
          </div>
          {error && (
            <p className="mt-3 text-sm text-red-600 dark:text-red-400">
              {error}
            </p>
          )}
        </div>
      )}

      {previewUrl && (
        <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <h3 className="text-lg font-medium">Review</h3>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            This is what will be uploaded.{' '}
            {hasGhost
              ? 'Baseline overlay is showing — toggle off to see the new photo alone, or retake if alignment is off.'
              : 'Confirm or retake.'}
          </p>
          <div className="relative mt-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt="Preview"
              className="max-h-96 w-full rounded-lg object-contain"
            />
            {hasGhost && showGhost && baselineUrl && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={baselineUrl}
                alt="Baseline ghost overlay"
                className="pointer-events-none absolute inset-0 max-h-96 w-full rounded-lg object-contain"
                style={{ opacity: 0.35, mixBlendMode: 'normal' }}
              />
            )}
          </div>
          {hasGhost && (
            <div className="mt-3 flex items-center gap-3">
              <label className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400">
                <input
                  type="checkbox"
                  checked={showGhost}
                  onChange={(e) => setShowGhost(e.target.checked)}
                  className="h-4 w-4 rounded border-zinc-300"
                />
                Show baseline overlay
              </label>
            </div>
          )}
          {error && (
            <p className="mt-3 text-sm text-red-600 dark:text-red-400">
              {error}
            </p>
          )}
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={upload}
              disabled={uploading}
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
            >
              {uploading ? 'Uploading…' : 'Upload'}
            </button>
            <button
              type="button"
              onClick={cancel}
              disabled={uploading}
              className="rounded-lg border border-zinc-300 px-3 py-2 text-xs text-zinc-700 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300"
            >
              Retake
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
