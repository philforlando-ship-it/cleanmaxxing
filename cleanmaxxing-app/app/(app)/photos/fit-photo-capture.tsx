'use client';

// Lean capture flow for fit (outfit) photos. Different from
// CapturePhoto used by face/body milestones:
//   - No slot or angle controls — fit photos are chronological,
//     not milestone-keyed.
//   - No baseline ghost overlay — each fit photo stands on its own;
//     comparison happens through Mister P chat, not visual diff.
//   - Each upload creates a new progress_photos row (category='fit')
//     instead of replacing a slot. The upload route handles the
//     insert-not-upsert path on its end.

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

export function FitPhotoCapture() {
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
      // Slot + angle are placeholders for fit — the upload route
      // ignores them for category='fit' and routes to the chronological
      // insert path.
      form.append('slot', 'baseline');
      form.append('angle', 'front');
      form.append('category', 'fit');
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

  if (!previewUrl) {
    return (
      <div className="rounded-lg border border-dashed border-zinc-300 bg-white p-5 dark:border-zinc-700 dark:bg-zinc-900">
        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
          Add a fit photo
        </p>
        <p className="mt-1 text-[13px] leading-relaxed text-zinc-600 dark:text-zinc-400">
          One full-body clothed shot. Mirror selfie or someone else
          taking it both work — even lighting, full outfit visible
          head to feet. Mister P can troubleshoot fit verbally in chat.
        </p>
        <div className="mt-3">
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
            capture="environment"
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
    );
  }

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
        Review
      </p>
      <p className="mt-1 text-[13px] text-zinc-600 dark:text-zinc-400">
        This is what will be saved.
      </p>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={previewUrl}
        alt="Fit photo preview"
        className="mt-3 max-h-96 w-full rounded-lg object-contain"
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
          {uploading ? 'Uploading…' : 'Save fit photo'}
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
  );
}
