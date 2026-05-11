// Fit-photos section for /photos. Chronological list (latest first)
// of clothed outfit photos the user has uploaded for Mister P chat
// fit-troubleshooting context. Distinct from face/body which are
// milestone-keyed; fit is an ever-growing log.

import { DeletePhotoButton } from '@/app/(app)/profile/delete-photo-button';
import { FitPhotoCapture } from './fit-photo-capture';

export type FitPhotoRow = {
  id: string;
  storage_path: string;
  captured_at: string;
  signedUrl: string | null;
};

type Props = {
  rows: ReadonlyArray<FitPhotoRow>;
  timezone: string;
};

export function FitPhotoSection({ rows, timezone }: Props) {
  return (
    <section>
      <h2 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
        Fit photos
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
        Clothed outfit photos for Mister P chat. He can troubleshoot
        fit — sleeves, shoulders, taper, proportions — grounded in the
        dimensions you entered on /plan/style. Not a body-comp photo
        and not scored. Add as many as you want.
      </p>

      <div className="mt-5">
        <FitPhotoCapture />
      </div>

      {rows.length > 0 && (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {rows.map((row) => (
            <FitPhotoCard key={row.id} row={row} timezone={timezone} />
          ))}
        </div>
      )}
    </section>
  );
}

function FitPhotoCard({
  row,
  timezone,
}: {
  row: FitPhotoRow;
  timezone: string;
}) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
      <p className="text-[11px] uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
        {formatDate(row.captured_at, timezone)}
      </p>
      {row.signedUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={row.signedUrl}
          alt="Fit photo"
          className="mt-2 max-h-80 w-full rounded-md object-contain"
        />
      )}
      <div className="mt-3">
        <DeletePhotoButton photoId={row.id} label="Delete" />
      </div>
    </div>
  );
}

function formatDate(iso: string, timezone: string): string {
  try {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date(iso));
  } catch {
    return new Date(iso).toLocaleDateString();
  }
}
