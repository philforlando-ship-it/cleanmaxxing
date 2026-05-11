'use client';

// Compact control for an optional non-front-angle photo at a given
// milestone slot. Two states:
//
//   1. Photo exists  → small thumbnail + delete button
//   2. No photo yet  → "+ Add <angle>" button that opens the file
//      picker and auto-uploads on pick
//
// No preview or ghost-overlay step — that depth belongs to the main
// front-facing CapturePhoto. Detail angles are an add-on; if the
// user picks the wrong file, the row is two clicks away from delete.
//
// Only rendered when a front photo for the same (slot, category)
// already exists.

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DeletePhotoButton } from './delete-photo-button';

type Slot = 'baseline' | 'progress_30d' | 'progress_90d' | 'progress_180d';
type Angle = 'close' | 'side' | 'back';
type Category = 'face' | 'body';

type Props = {
  slot: Slot;
  angle: Angle;
  category: Category;
  existingPhotoId?: string | null;
  existingSignedUrl?: string | null;
};

function angleLabel(angle: Angle, category: Category): string {
  if (angle === 'close') return 'Close-up';
  if (angle === 'back') return 'Back';
  // side: head silhouette for face shots, full-body side view for body
  return category === 'face' ? 'Side profile' : 'Side';
}

export function AngleSlot({
  slot,
  angle,
  category,
  existingPhotoId = null,
  existingSignedUrl = null,
}: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const label = angleLabel(angle, category);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setUploading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append('file', f);
      form.append('slot', slot);
      form.append('angle', angle);
      form.append('category', category);
      const res = await fetch('/api/progress-photos/upload', {
        method: 'POST',
        body: form,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Upload failed (${res.status})`);
      }
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  if (existingPhotoId && existingSignedUrl) {
    return (
      <div className="mt-2 flex items-center gap-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={existingSignedUrl}
          alt={label}
          className="h-9 w-9 flex-none rounded-md object-cover"
        />
        <span className="flex-1 text-[11px] uppercase tracking-wider text-zinc-500">
          {label}
        </span>
        <DeletePhotoButton
          photoId={existingPhotoId}
          label="Delete"
        />
      </div>
    );
  }

  return (
    <div className="mt-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
        capture="user"
        onChange={onPick}
        className="hidden"
        disabled={uploading}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="text-[11px] text-zinc-500 underline hover:text-zinc-700 disabled:opacity-50 dark:text-zinc-400 dark:hover:text-zinc-200"
      >
        {uploading ? `Uploading ${label.toLowerCase()}…` : `+ Add ${label.toLowerCase()}`}
      </button>
      {error && (
        <p className="mt-1 text-[11px] text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
