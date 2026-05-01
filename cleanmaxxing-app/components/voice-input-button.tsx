'use client';

// Mic button for chat input. Tap to record, tap to stop; auto-stops
// at MAX_SECONDS so a forgotten recorder doesn't accumulate. After
// stop, posts the captured audio to /api/transcribe and calls
// onTranscribed with the returned text. The parent owns input state
// — typically appends the transcript to whatever's already there
// rather than replacing it.

import { useCallback, useEffect, useRef, useState } from 'react';

type Status = 'idle' | 'recording' | 'transcribing' | 'error';

type Props = {
  onTranscribed: (text: string) => void;
  disabled?: boolean;
};

const MAX_SECONDS = 60;

export function VoiceInputButton({ onTranscribed, disabled }: Props) {
  const [status, setStatus] = useState<Status>('idle');
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopTracks = useCallback(() => {
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    recorderRef.current = null;
  }, []);

  // Tear down on unmount — in case the user navigates away mid-record.
  useEffect(() => {
    return () => stopTracks();
  }, [stopTracks]);

  const start = useCallback(async () => {
    setError(null);
    chunksRef.current = [];
    if (typeof window === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setError('Voice input not supported on this browser');
      setStatus('error');
      return;
    }
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setError('Microphone permission denied');
      setStatus('error');
      return;
    }
    streamRef.current = stream;

    // Pick a codec the browser actually supports. Chrome/Firefox
    // give us webm/opus; Safari gives us mp4. Let MediaRecorder
    // default when nothing matches — the server-side endpoint
    // rewraps the blob with a sensible filename either way.
    const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'];
    const mimeType =
      candidates.find((t) => MediaRecorder.isTypeSupported(t)) ?? '';
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    recorderRef.current = recorder;

    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = async () => {
      const blob = new Blob(chunksRef.current, {
        type: recorder.mimeType || 'audio/webm',
      });
      chunksRef.current = [];
      stopTracks();
      if (blob.size === 0) {
        setStatus('idle');
        setElapsed(0);
        return;
      }
      setStatus('transcribing');
      try {
        const ext = (recorder.mimeType || 'audio/webm').includes('mp4')
          ? 'mp4'
          : 'webm';
        const file = new File([blob], `recording.${ext}`, { type: blob.type });
        const form = new FormData();
        form.append('audio', file);
        const res = await fetch('/api/transcribe', { method: 'POST', body: form });
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(body.error ?? `Transcription failed (${res.status})`);
        }
        const { text } = (await res.json()) as { text: string };
        if (text) onTranscribed(text);
        setStatus('idle');
        setElapsed(0);
      } catch (err) {
        setError((err as Error).message);
        setStatus('error');
      }
    };

    recorder.start();
    setStatus('recording');
    setElapsed(0);
    tickRef.current = setInterval(() => {
      setElapsed((e) => {
        const next = e + 1;
        if (next >= MAX_SECONDS) {
          // Auto-stop. The onstop handler runs the upload.
          if (recorder.state === 'recording') recorder.stop();
        }
        return next;
      });
    }, 1000);
  }, [onTranscribed, stopTracks]);

  const stop = useCallback(() => {
    const r = recorderRef.current;
    if (r && r.state === 'recording') r.stop();
  }, []);

  function handleClick() {
    if (status === 'recording') {
      stop();
    } else if (status === 'idle' || status === 'error') {
      start();
    }
  }

  const buttonDisabled = disabled || status === 'transcribing';

  let label = 'Use voice input';
  let visual: React.ReactNode;
  if (status === 'recording') {
    label = `Stop recording (${elapsed}s)`;
    visual = (
      <span className="flex items-center gap-1.5">
        <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
        <span className="text-xs tabular-nums">{elapsed}s</span>
      </span>
    );
  } else if (status === 'transcribing') {
    label = 'Transcribing';
    visual = <span className="text-xs">…</span>;
  } else {
    visual = <MicIcon />;
  }

  return (
    <div className="flex flex-col items-end">
      <button
        type="button"
        onClick={handleClick}
        disabled={buttonDisabled}
        aria-label={label}
        title={label}
        className={
          status === 'recording'
            ? 'rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-red-700 hover:bg-red-100 disabled:opacity-50 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300'
            : 'rounded-lg border border-zinc-300 px-3 py-2 text-zinc-700 hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800'
        }
      >
        {visual}
      </button>
      {error && status === 'error' && (
        <span className="mt-1 max-w-[10rem] text-right text-[11px] text-red-600 dark:text-red-400">
          {error}
        </span>
      )}
    </div>
  );
}

function MicIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0" />
      <line x1="12" y1="18" x2="12" y2="22" />
    </svg>
  );
}
