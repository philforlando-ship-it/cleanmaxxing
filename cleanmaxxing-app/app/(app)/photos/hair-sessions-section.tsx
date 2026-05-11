// Read-only viewing surface for hair photo sessions on /photos.
// Capture itself stays on /plan/hair/photos because session creation
// is wired into Stage 5 monitoring cadence — this section just
// surfaces what's already been captured, grouped by session for
// organizational clarity (the timeline panel below shows the same
// photos chronologically without the session grouping).

import Link from 'next/link';

const HAIR_ANGLE_LABEL: Record<string, string> = {
  front: 'front',
  hairline: 'hairline',
  side_left: 'side (left)',
  side_right: 'side (right)',
  crown: 'crown',
  styled: 'styled',
  top_down: 'top-down',
};

// Canonical display order. Hair track first (front → styled), then
// bald track (top_down). Photos in unknown angles fall to the end.
const ANGLE_ORDER: ReadonlyArray<string> = [
  'front',
  'hairline',
  'side_left',
  'side_right',
  'crown',
  'styled',
  'top_down',
];

export type HairSessionPhoto = {
  id: string;
  angle: string;
  signedUrl: string | null;
  captured_at: string;
};

export type HairSession = {
  id: string;
  captured_at: string;
  completed_at: string | null;
  notes: string | null;
  photos: ReadonlyArray<HairSessionPhoto>;
};

type Props = {
  sessions: ReadonlyArray<HairSession>;
  timezone: string;
};

export function HairSessionsSection({ sessions, timezone }: Props) {
  return (
    <section>
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
          Hair sessions
        </h2>
        <Link
          href="/plan/hair/photos"
          className="text-[13px] text-zinc-700 underline decoration-dotted underline-offset-2 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100"
        >
          New session →
        </Link>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
        Each session is a set of angles captured in one sitting (front,
        hairline, sides, crown, styled — or top-down for the bald track).
        Capture and re-capture happens on{' '}
        <Link
          href="/plan/hair/photos"
          className="underline decoration-dotted underline-offset-2"
        >
          /plan/hair/photos
        </Link>
        ; this is the read-only view.
      </p>

      {sessions.length === 0 ? (
        <p className="mt-6 text-sm text-zinc-500 dark:text-zinc-400">
          No hair sessions yet. Start one from /plan/hair/photos when
          you&rsquo;re ready to track over time.
        </p>
      ) : (
        <ul className="mt-6 space-y-6">
          {sessions.map((session) => (
            <HairSessionCard
              key={session.id}
              session={session}
              timezone={timezone}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function HairSessionCard({
  session,
  timezone,
}: {
  session: HairSession;
  timezone: string;
}) {
  const orderedPhotos = [...session.photos].sort((a, b) => {
    const ai = ANGLE_ORDER.indexOf(a.angle);
    const bi = ANGLE_ORDER.indexOf(b.angle);
    const aPos = ai === -1 ? ANGLE_ORDER.length : ai;
    const bPos = bi === -1 ? ANGLE_ORDER.length : bi;
    return aPos - bPos;
  });

  return (
    <li className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
          {formatDate(session.captured_at, timezone)}
        </p>
        {!session.completed_at && (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-800 dark:bg-amber-900 dark:text-amber-200">
            In progress
          </span>
        )}
      </div>
      {session.notes && (
        <p className="mt-1.5 text-[13px] italic text-zinc-600 dark:text-zinc-400">
          {session.notes}
        </p>
      )}
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {orderedPhotos.map((photo) => (
          <div
            key={photo.id}
            className="rounded-md border border-zinc-200 bg-zinc-50 p-2 dark:border-zinc-800 dark:bg-zinc-950"
          >
            {photo.signedUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={photo.signedUrl}
                alt={`Hair photo — ${HAIR_ANGLE_LABEL[photo.angle] ?? photo.angle}`}
                className="h-32 w-full rounded object-cover object-top"
              />
            )}
            <p className="mt-1.5 text-center text-[11px] uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              {HAIR_ANGLE_LABEL[photo.angle] ?? photo.angle}
            </p>
          </div>
        ))}
      </div>
    </li>
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
