'use client';

// Progress photos management on /settings. Lists any stored photos
// with per-photo delete + a "delete all" option. Server passes signed
// URLs for thumbnails so the bucket stays private.

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export type ProgressPhotoEntry = {
  id: string;
  slot: 'baseline' | 'progress_30d' | 'progress_90d' | 'progress_180d';
  captured_at: string;
  signedUrl: string | null;
};

type Props = {
  photos: ProgressPhotoEntry[];
};

const SLOT_LABEL: Record<ProgressPhotoEntry['slot'], string> = {
  baseline: 'Baseline',
  progress_30d: '30-day',
  progress_90d: '90-day',
  progress_180d: '180-day',
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function ProgressPhotosSection({ photos }: Props) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [bulkConfirming, setBulkConfirming] = useState(false);
  const [_, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function deleteOne(id: string) {
    setPendingId(id);
    setError(null);
    try {
      const res = await fetch('/api/progress-photos/delete', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Delete failed (${res.status})`);
      }
      startTransition(() => router.refresh());
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setPendingId(null);
    }
  }

  async function deleteAll() {
    setPendingId('__all__');
    setError(null);
    try {
      const res = await fetch('/api/progress-photos/delete', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id: 'all' }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Delete failed (${res.status})`);
      }
      setBulkConfirming(false);
      startTransition(() => router.refresh());
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setPendingId(null);
    }
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="text-lg font-medium">Progress photos</h2>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        Your baseline and 90-day photos are stored privately and visible
        only to you. No AI analysis. Retained until you delete them.
      </p>

      {photos.length === 0 ? (
        <div className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
          No photos captured yet.{' '}
          <Link href="/profile" className="underline">
            Capture a baseline
          </Link>{' '}
          to start the comparison.
        </div>
      ) : (
        <>
          <ul className="mt-4 space-y-4">
            {photos.map((photo) => {
              const isPending = pendingId === photo.id;
              return (
                <li
                  key={photo.id}
                  className="flex items-center gap-4 rounded-lg border border-zinc-200 p-3 dark:border-zinc-800"
                >
                  {photo.signedUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={photo.signedUrl}
                      alt={SLOT_LABEL[photo.slot]}
                      className="h-16 w-16 shrink-0 rounded-md object-cover"
                    />
                  ) : (
                    <div className="h-16 w-16 shrink-0 rounded-md bg-zinc-200 dark:bg-zinc-800" />
                  )}
                  <div className="flex-1">
                    <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                      {SLOT_LABEL[photo.slot]}
                    </div>
                    <div className="text-xs text-zinc-500">
                      Captured {formatDate(photo.captured_at)}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => deleteOne(photo.id)}
                    disabled={isPending}
                    className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs text-zinc-700 hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  >
                    {isPending ? 'Deleting…' : 'Delete'}
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="mt-5 border-t border-zinc-200 pt-4 dark:border-zinc-800">
            {bulkConfirming ? (
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <span className="text-zinc-700 dark:text-zinc-300">
                  Delete both photos?
                </span>
                <button
                  type="button"
                  onClick={deleteAll}
                  disabled={pendingId === '__all__'}
                  className="rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
                >
                  {pendingId === '__all__' ? 'Deleting…' : 'Yes, delete all'}
                </button>
                <button
                  type="button"
                  onClick={() => setBulkConfirming(false)}
                  disabled={pendingId === '__all__'}
                  className="text-xs text-zinc-500 underline dark:text-zinc-400"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setBulkConfirming(true)}
                className="text-xs text-zinc-500 underline hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
              >
                Delete all progress photos
              </button>
            )}
          </div>
        </>
      )}

      {error && (
        <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}
