'use client';

// Single-angle hair photo capture, Stage 5 quarterly anchor.
//
// 2026-05-11: switched from bare <input type="file" capture> to the
// CameraCapture component with per-angle alignment overlay + previous
// session photo as a faint ghost behind the live preview. The ghost
// is the load-bearing change — Stage 5's value (AI compare-across-
// sessions) only works if framing matches between sessions, and the
// old flow gave the user zero help lining up.
//
// 25 MB cap, JPEG/PNG/WebP/HEIC — same as progress photos. The route
// does the actual size + mime validation; CameraCapture's canvas
// output is always JPEG so HEIC only matters on the file fallback.

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CameraCapture } from '@/components/camera-capture';
import {
  CrownOverlay,
  FaceOvalOverlay,
  HairlineOverlay,
  SideProfileOverlay,
} from '@/components/photo-overlays';
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

// Map each angle to the alignment overlay that fits its framing.
function overlayFor(angle: HairPhotoAngle): React.ReactNode {
  switch (angle) {
    case 'front':
    case 'styled':
      return <FaceOvalOverlay />;
    case 'hairline':
      return <HairlineOverlay />;
    case 'crown':
    case 'top_down':
      return <CrownOverlay />;
    case 'side_left':
      return <SideProfileOverlay />;
    case 'side_right':
      return <SideProfileOverlay mirror />;
  }
}

export function HairPhotoCapture({
  angle,
  sessionId,
  existingPhotoId,
  existingSignedUrl,
}: Props) {
  const router = useRouter();
  const [pendingBlob, setPendingBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function onCapture(blob: Blob) {
    setError(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPendingBlob(blob);
    setPreviewUrl(URL.createObjectURL(blob));
  }

  function cancelPreview() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPendingBlob(null);
    setPreviewUrl(null);
    setError(null);
  }

  async function upload() {
    if (!pendingBlob) return;
    setUploading(true);
    setError(null);
    try {
      const form = new FormData();
      // Name the part 'hair-{angle}.jpg' — the route reads form.file
      // and runs it through processPhotoUpload regardless of name,
      // but a meaningful filename helps when debugging storage.
      form.append('file', pendingBlob, `hair-${angle}.jpg`);
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
      setPendingBlob(null);
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
              onClick={cancelPreview}
              disabled={uploading}
              className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs text-zinc-700 hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Retake
            </button>
          </div>
        </>
      )}

      {!previewUrl && (
        <div className="mt-3">
          <CameraCapture
            facingMode="user"
            overlay={overlayFor(angle)}
            referencePhotoUrl={existingSignedUrl}
            onCapture={onCapture}
            disabled={uploading}
          />
        </div>
      )}

      {error && (
        <p className="mt-2 text-xs text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}
