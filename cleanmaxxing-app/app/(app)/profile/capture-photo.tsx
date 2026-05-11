'use client';

// Client-side capture flow for a progress photo. Shows the consent
// copy, captures via the in-browser camera (with face-oval / body
// overlay + baseline ghost during the live preview, so the user can
// line up before they shoot), previews the captured frame with the
// post-capture baseline ghost toggle, then POSTs to the upload API.
// No bytes leave the device until the user clicks Upload. Falls
// back to a file picker if getUserMedia is unavailable or denied.

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CameraCapture } from '@/components/camera-capture';
import {
  FaceOvalOverlay,
  FullBodyOverlay,
} from '@/components/photo-overlays';

type Slot = 'baseline' | 'progress_30d' | 'progress_90d' | 'progress_180d';
type Category = 'face' | 'body';
type Angle = 'front' | 'close' | 'side' | 'back';

type Props = {
  slot: Slot;
  // Signed URL of the user's baseline photo for the same category.
  // When passed (i.e., for any non-baseline slot), the capture
  // surface renders a ghost overlay of the baseline at low opacity
  // over the file picker / preview so the user can match angle,
  // distance, and framing. Optional — baseline-slot captures pass
  // null since there's nothing to align against.
  baselineUrl?: string | null;
  // Photo category. Defaults to 'face' so existing callers (e.g. the
  // onboarding baseline-photo page) keep working without changes.
  // The /photos page passes 'body' for the full-body section.
  category?: Category;
  // Photo angle. Defaults to 'front' so existing callers stay on
  // the canonical front-facing capture. Multi-angle capture surfaces
  // (onboarding extras, /photos non-baseline slots) pass 'close',
  // 'side', or 'back' explicitly.
  angle?: Angle;
};

const SLOT_LABEL: Record<Slot, string> = {
  baseline: 'baseline',
  progress_30d: '30-day',
  progress_90d: '90-day',
  progress_180d: '180-day',
};

export function CapturePhoto({
  slot,
  baselineUrl = null,
  category = 'face',
  angle = 'front',
}: Props) {
  const router = useRouter();
  const [pendingBlob, setPendingBlob] = useState<Blob | File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showGhost, setShowGhost] = useState(true);
  const hasGhost = slot !== 'baseline' && Boolean(baselineUrl);

  function onCapture(blob: Blob) {
    setError(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPendingBlob(blob);
    setPreviewUrl(URL.createObjectURL(blob));
  }

  function cancel() {
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
      // Filename helps debugging in storage; processPhotoUpload
      // re-encodes server-side so extension is informational only.
      const filename =
        pendingBlob instanceof File
          ? pendingBlob.name
          : `${category}-${slot}-${angle}.jpg`;
      form.append('file', pendingBlob, filename);
      form.append('slot', slot);
      form.append('category', category);
      form.append('angle', angle);
      const res = await fetch('/api/progress-photos/upload', {
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

  return (
    <div>
      {!previewUrl && (
        <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <h3 className="text-lg font-medium">
            Capture your {SLOT_LABEL[slot]}{category === 'body' ? ' body' : ''} photo
          </h3>
          <div className="mt-3 space-y-2 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
            <p>
              {category === 'body'
                ? 'One front-facing full-body photo. Good lighting, neutral expression, no filter, fitted or minimal clothing so changes are visible.'
                : 'One front-facing photo of your face. Good lighting, neutral expression, no filter.'}{' '}
              You&rsquo;re capturing a reference point to compare against
              later — the photo itself is the evidence.
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
              via short-lived signed URLs. You can delete the photo any time
              from the corresponding card on this page.
            </p>
          </div>
          <div className="mt-5">
            <CameraCapture
              facingMode="user"
              overlay={
                category === 'body' ? <FullBodyOverlay /> : <FaceOvalOverlay />
              }
              referencePhotoUrl={hasGhost ? baselineUrl : null}
              onCapture={onCapture}
              disabled={uploading}
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
