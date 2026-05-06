'use client';

// Single-angle hair photo capture. Adapted from the existing
// CapturePhoto pattern (file picker + preview + upload) but scoped to
// one HairPhotoAngle at a time, with the existing photo (if any) shown
// inline so the user knows the slot is filled.
//
// 25 MB cap, JPEG/PNG/WebP — same as progress photos. The route does
// the actual size + mime validation; we keep the input filter narrow
// to surface obvious mistakes early.

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  HAIR_PHOTO_ANGLE_HINT,
  HAIR_PHOTO_ANGLE_LABEL,
  type HairPhotoAngle,
} from '@/lib/hair/photos/types';

type Props = {
  angle: HairPhotoAngle;
  sessionId: string;
  existingPhotoId: string | null;
  existingSignedUrl: string | null;
};

export function HairPhotoCapture({
  angle,
  sessionId,
  existingPhotoId,
  existingSignedUrl,
}: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
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
      form.append('angle', angle);
      form.append('session_id', sessionId);
      const res = await fetch('/api/plan/hair/photos/upload', {
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

  async function deletePhoto() {
    if (!existingPhotoId) return;
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/plan/hair/photos/${existingPhotoId}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Delete failed (${res.status})`);
      }
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            {HAIR_PHOTO_ANGLE_LABEL[angle]}
          </h3>
          <p className="mt-0.5 text-[12px] text-zinc-500 dark:text-zinc-400">
            {HAIR_PHOTO_ANGLE_HINT[angle]}
          </p>
        </div>
        {existingPhotoId && !previewUrl && (
          <button
            type="button"
            onClick={deletePhoto}
            disabled={deleting}
            className="text-xs text-zinc-500 underline decoration-dotted underline-offset-2 hover:text-zinc-700 disabled:opacity-50 dark:text-zinc-400 dark:hover:text-zinc-200"
          >
            {deleting ? 'Deleting…' : 'Delete'}
          </button>
        )}
      </div>

      {existingSignedUrl && !previewUrl && (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={existingSignedUrl}
          alt={HAIR_PHOTO_ANGLE_LABEL[angle]}
          className="mt-3 max-h-56 w-full rounded-md object-contain"
        />
      )}

      {previewUrl && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt="Preview"
            className="mt-3 max-h-56 w-full rounded-md object-contain"
          />
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={upload}
              disabled={uploading}
              className="rounded-lg bg-zinc-900 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              {uploading ? 'Uploading…' : existingPhotoId ? 'Replace' : 'Upload'}
            </button>
            <button
              type="button"
              onClick={cancel}
              disabled={uploading}
              className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs text-zinc-700 hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Cancel
            </button>
          </div>
        </>
      )}

      {!previewUrl && (
        <div className="mt-3">
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            capture="user"
            onChange={onPick}
            className="block w-full text-xs text-zinc-700 file:mr-3 file:rounded-md file:border-0 file:bg-zinc-100 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-zinc-900 hover:file:bg-zinc-200 dark:text-zinc-300 dark:file:bg-zinc-800 dark:file:text-zinc-100 dark:hover:file:bg-zinc-700"
          />
        </div>
      )}

      {error && (
        <p className="mt-2 text-xs text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}
