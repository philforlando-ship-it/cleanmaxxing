'use client';

// In-browser camera capture with optional alignment overlay and
// reference-photo ghost. Replaces the bare <input type="file" capture>
// flow on surfaces where shot-to-shot consistency matters (hair Stage 5
// quarterly anchors, multi-angle baseline). Falls back to a file input
// when getUserMedia isn't available or the user denies permission, so
// the worst case is the same UX we had before.
//
// On selfie mode the video preview is mirrored (CSS scaleX) but the
// captured frame is NOT — the canvas reads the raw video so saved
// images don't have backwards text. iOS Safari needs `playsInline`
// + `muted` + `autoplay` for the live preview to actually start.

import { useEffect, useRef, useState } from 'react';

export type CameraCaptureProps = {
  // 'user' = front camera (selfies, mirrored preview).
  // 'environment' = rear camera (outfit shots, fit photos).
  facingMode: 'user' | 'environment';
  // Optional alignment guide rendered on top of the live preview.
  // Pass null/undefined for no overlay.
  overlay?: React.ReactNode;
  // Optional URL of the previous photo for this slot. When set,
  // rendered as a faint ghost beneath the video so the user can line
  // up the same way as last session. The whole point of this on Stage 5
  // — AI compare-across-sessions only works if the framing matches.
  referencePhotoUrl?: string | null;
  // Called with the captured Blob on user confirm.
  onCapture: (blob: Blob) => void;
  // Called when user cancels (only relevant when in captured-preview
  // state; the start/streaming states have no cancel affordance).
  onCancel?: () => void;
  // Hide controls while parent is uploading.
  disabled?: boolean;
  // File-input accept list, used by the fallback path.
  accept?: string;
};

type Mode =
  | 'idle' // not yet started
  | 'requesting' // calling getUserMedia
  | 'streaming' // live preview active
  | 'denied' // permission denied or getUserMedia unsupported → fallback
  | 'error'; // unexpected failure during streaming

const DEFAULT_ACCEPT =
  'image/jpeg,image/png,image/webp,image/heic,image/heif';

export function CameraCapture({
  facingMode,
  overlay,
  referencePhotoUrl,
  onCapture,
  onCancel,
  disabled,
  accept = DEFAULT_ACCEPT,
}: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [mode, setMode] = useState<Mode>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function stopStream() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }

  // Always release the camera when the component unmounts.
  useEffect(() => {
    return stopStream;
  }, []);

  async function startStream() {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setMode('denied');
      return;
    }
    setMode('requesting');
    setErrorMessage(null);
    try {
      // ideal 1920x1080 — the server resizes to 1600px long-edge
      // anyway, so anything past that is wasted bandwidth. facingMode
      // is a hint not a hard constraint; iPhones honor it reliably,
      // some Androids fall back to whichever camera they prefer.
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setMode('streaming');
    } catch (err) {
      // Most common: NotAllowedError (denied) or NotFoundError
      // (no camera). Either way → fall back to file input. Don't
      // dump the raw error string on the user.
      console.warn('camera_get_user_media_failed', err);
      setMode('denied');
    }
  }

  function capture() {
    const video = videoRef.current;
    if (!video || mode !== 'streaming') return;
    const w = video.videoWidth;
    const h = video.videoHeight;
    if (!w || !h) {
      setMode('error');
      setErrorMessage('Camera not ready — try again in a moment.');
      return;
    }
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      setMode('error');
      setErrorMessage('Could not capture frame.');
      return;
    }
    // No transform on the canvas — the mirrored preview is CSS-only.
    // We want the saved file to be un-mirrored so text reads correctly.
    ctx.drawImage(video, 0, 0, w, h);
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setMode('error');
          setErrorMessage('Capture failed — please retake.');
          return;
        }
        stopStream();
        setMode('idle');
        onCapture(blob);
      },
      'image/jpeg',
      0.92,
    );
  }

  function onFileFallback(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    onCapture(f);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function cancel() {
    stopStream();
    setMode('idle');
    setErrorMessage(null);
    onCancel?.();
  }

  // Fallback path: getUserMedia unsupported or denied.
  if (mode === 'denied') {
    return (
      <div className="space-y-2">
        <p className="text-[12px] text-zinc-500 dark:text-zinc-400">
          In-browser camera unavailable — pick a photo from your library
          or take one with your camera app instead.
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          capture={facingMode}
          onChange={onFileFallback}
          disabled={disabled}
          className="block w-full text-xs text-zinc-700 file:mr-3 file:rounded-md file:border-0 file:bg-zinc-100 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-zinc-900 hover:file:bg-zinc-200 disabled:opacity-50 dark:text-zinc-300 dark:file:bg-zinc-800 dark:file:text-zinc-100 dark:hover:file:bg-zinc-700"
        />
      </div>
    );
  }

  // Idle: show the "Open camera" button. We don't auto-request the
  // stream on mount — that would prompt for permission before the
  // user has indicated intent.
  if (mode === 'idle' || mode === 'requesting') {
    return (
      <div className="space-y-2">
        <button
          type="button"
          onClick={startStream}
          disabled={disabled || mode === 'requesting'}
          className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-900 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
        >
          {mode === 'requesting' ? 'Opening camera…' : 'Open camera'}
        </button>
        <details className="text-[11px] text-zinc-500 dark:text-zinc-400">
          <summary className="cursor-pointer underline decoration-dotted underline-offset-2">
            Or upload a file
          </summary>
          <input
            ref={fileInputRef}
            type="file"
            accept={accept}
            capture={facingMode}
            onChange={onFileFallback}
            disabled={disabled}
            className="mt-2 block w-full text-xs text-zinc-700 file:mr-3 file:rounded-md file:border-0 file:bg-zinc-100 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-zinc-900 hover:file:bg-zinc-200 disabled:opacity-50 dark:text-zinc-300 dark:file:bg-zinc-800 dark:file:text-zinc-100 dark:hover:file:bg-zinc-700"
          />
        </details>
      </div>
    );
  }

  // Streaming + error: live preview frame.
  return (
    <div className="space-y-2">
      <div className="relative aspect-[3/4] overflow-hidden rounded-lg bg-black">
        {referencePhotoUrl && (
          // Reference photo as faint ghost behind the live video. Only
          // matters on Stage 5 (or anywhere else with a previous shot
          // for the same slot) — the user lines up the same way they
          // did last session, which is what makes AI compare-across-
          // sessions work.
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={referencePhotoUrl}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 h-full w-full object-cover opacity-25"
          />
        )}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`relative h-full w-full object-cover ${
            facingMode === 'user' ? 'scale-x-[-1]' : ''
          }`}
        />
        {overlay && (
          <div className="pointer-events-none absolute inset-0">
            {overlay}
          </div>
        )}
      </div>

      {errorMessage && (
        <p className="text-xs text-red-600 dark:text-red-400">
          {errorMessage}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={capture}
          disabled={disabled || mode !== 'streaming'}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          Capture
        </button>
        <button
          type="button"
          onClick={cancel}
          disabled={disabled}
          className="rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
