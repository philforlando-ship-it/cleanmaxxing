'use client';

// Client-side capture flow for a progress photo. Shows the consent
// copy, accepts a file from the camera (mobile) or file picker
// (desktop), previews it client-side before upload so the user can
// see what they're actually sending, and then POSTs to the upload
// API. No bytes leave the device until the user clicks Upload.

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

type Slot = 'baseline' | 'progress_90d';

type Props = {
  slot: Slot;
};

const SLOT_LABEL: Record<Slot, string> = {
  baseline: 'baseline',
  progress_90d: '90-day',
};

export function CapturePhoto({ slot }: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
              Stored privately in your account, visible only to you, accessed
              via short-lived signed URLs. <strong>No AI analysis.</strong>{' '}
              You can delete the photo any time from Settings → Progress
              photos.
            </p>
          </div>
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
            This is what will be uploaded. Confirm or retake.
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt="Preview"
            className="mt-4 max-h-96 w-full rounded-lg object-contain"
          />
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
