// /plan/hair/photos — Stage 5 photo capture surface.
//
// Server component: pulls all hair sessions + their photos, mints
// signed URLs at request time, derives the open session (the one
// currently being captured), and renders both the active capture grid
// and the past sessions list.
//
// AI analysis lives at the bottom — premium-gated, opt-in, runs against
// any two completed sessions.

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getPremiumStatus } from '@/lib/billing/is-premium';
import { listHairSessionsWithPhotos } from '@/lib/hair/photos/service';
import {
  BALD_TRACK_ANGLES,
  HAIR_PHOTO_ANGLE_LABEL,
  HAIR_TRACK_ANGLES,
  type HairPhotoAngle,
} from '@/lib/hair/photos/types';
import { getHairAssessment } from '@/lib/hair/service';
import { HairPhotoCapture } from './hair-photo-capture';
import { HairPhotoCompleteButton } from './hair-photo-complete-button';
import { HairPhotoAnalysisPanel } from './hair-photo-analysis-panel';

const BUCKET = 'progress-photos';
const SIGNED_URL_TTL_SECONDS = 60 * 60;

export default async function HairPhotosPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const [assessment, sessions, premium] = await Promise.all([
    getHairAssessment(supabase, user.id),
    listHairSessionsWithPhotos(supabase, user.id),
    getPremiumStatus(user.id),
  ]);

  if (!assessment) {
    redirect('/plan/hair');
  }

  // Mint signed URLs for every photo. Bounded set per user (typically
  // ≤ 5 angles × ≤ 8 sessions in v1 use), so the parallel call is fine.
  const allPhotoIds: string[] = [];
  const signedUrlByPhotoId = new Map<string, string | null>();
  const downloads = sessions.flatMap((s) =>
    s.photos.map(async (p) => {
      const { data: signed } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(p.storage_path, SIGNED_URL_TTL_SECONDS);
      signedUrlByPhotoId.set(p.id, signed?.signedUrl ?? null);
      allPhotoIds.push(p.id);
    }),
  );
  await Promise.all(downloads);

  // The "open" session is the most recent one with no completed_at.
  const openSession = sessions.find((s) => s.completed_at === null) ?? null;
  const completedSessions = sessions.filter((s) => s.completed_at !== null);

  // Track determination: bald track = stage_1_cut_family is bald_track,
  // OR density_state is shaved_or_buzzed, OR stage_2_path is transition.
  // Same logic Stage 5 card uses.
  const isBaldTrack =
    assessment.stage_1_cut_family === 'bald_track' ||
    assessment.stage_1_cut_family === 'clean_shave' ||
    assessment.density_state === 'shaved_or_buzzed' ||
    assessment.stage_2_path === 'transition';
  const angleSet: ReadonlyArray<HairPhotoAngle> = isBaldTrack
    ? BALD_TRACK_ANGLES
    : HAIR_TRACK_ANGLES;

  // Map angle → existing photo in the open session for quick lookup
  // by the capture component.
  const openPhotoByAngle = new Map<
    HairPhotoAngle,
    { id: string; signedUrl: string | null }
  >();
  if (openSession) {
    for (const p of openSession.photos) {
      openPhotoByAngle.set(p.angle, {
        id: p.id,
        signedUrl: signedUrlByPhotoId.get(p.id) ?? null,
      });
    }
  }

  const hasFrontOrTopDown = openSession
    ? openSession.photos.some((p) => p.angle === 'front' || p.angle === 'top_down')
    : false;

  // Sessions for the analysis-panel selector (completed only).
  const analysisSessionOptions = completedSessions.map((s) => ({
    id: s.id,
    capturedAt: s.captured_at,
  }));

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <Link
        href="/plan/hair"
        className="text-xs text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
      >
        ← Back to hair plan
      </Link>

      <header className="mt-6">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
          Hair photos
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-zinc-700 dark:text-zinc-300">
          Optional in-app photo storage for Stage 5. Reference points stored
          privately, visible only to you, accessed via short-lived signed
          URLs. JPEG / PNG / WebP, up to 25 MB per photo. You can delete
          individual photos any time.
        </p>
        <p className="mt-3 text-xs text-zinc-500">
          <Link
            href="/privacy/photos"
            className="underline underline-offset-2 hover:text-zinc-700 dark:hover:text-zinc-300"
          >
            How your photos are used →
          </Link>
        </p>
      </header>

      <section className="mt-10">
        <h2 className="text-xl font-semibold tracking-tight">
          {openSession ? 'Current session' : 'Start a new session'}
        </h2>
        <p className="mt-2 text-[14px] text-zinc-600 dark:text-zinc-400">
          {openSession
            ? `Started ${new Date(openSession.captured_at).toLocaleString()}. Add photos for any of the angles below — at least one (Front or Top-down) is needed for AI comparison later.`
            : 'Uploading any photo below will create a new session. You can keep adding angles for this session, then mark it complete.'}
        </p>

        <div className="mt-6 space-y-3">
          {angleSet.map((angle) => {
            const existing = openPhotoByAngle.get(angle);
            return (
              <HairPhotoCapture
                key={angle}
                angle={angle}
                sessionId={openSession?.id ?? ''}
                existingPhotoId={existing?.id ?? null}
                existingSignedUrl={existing?.signedUrl ?? null}
              />
            );
          })}
        </div>

        {openSession && openSession.photos.length > 0 && (
          <HairPhotoCompleteButton hasFrontOrTopDown={hasFrontOrTopDown} />
        )}
      </section>

      {completedSessions.length > 0 && (
        <section className="mt-12">
          <h2 className="text-xl font-semibold tracking-tight">
            Past sessions
          </h2>
          <div className="mt-4 space-y-6">
            {completedSessions.map((s) => (
              <article
                key={s.id}
                className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                    {new Date(s.captured_at).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </h3>
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">
                    {s.photos.length}{' '}
                    {s.photos.length === 1 ? 'photo' : 'photos'}
                  </span>
                </div>
                {s.notes && (
                  <p className="mt-2 text-[13px] italic text-zinc-600 dark:text-zinc-400">
                    {s.notes}
                  </p>
                )}
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {s.photos.map((p) => {
                    const url = signedUrlByPhotoId.get(p.id) ?? null;
                    return (
                      <div key={p.id}>
                        <p className="text-[11px] uppercase tracking-wider text-zinc-500">
                          {HAIR_PHOTO_ANGLE_LABEL[p.angle]}
                        </p>
                        {url ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={url}
                            alt={HAIR_PHOTO_ANGLE_LABEL[p.angle]}
                            className="mt-2 w-full rounded-md object-cover"
                          />
                        ) : (
                          <div className="mt-2 flex aspect-square items-center justify-center rounded-md border border-dashed border-zinc-300 text-xs text-zinc-500 dark:border-zinc-700">
                            unavailable
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      <HairPhotoAnalysisPanel
        sessions={analysisSessionOptions}
        isPremium={premium.isPremium}
      />
    </main>
  );
}
