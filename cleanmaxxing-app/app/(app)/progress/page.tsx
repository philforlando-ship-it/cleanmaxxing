// Progress photo surface. Shows the user's baseline and 90-day photos
// side-by-side for self-comparison. No AI analysis — the user's own
// eyes are the evidence. Server component so the signed URLs stay
// short-lived and never travel through client code that could cache
// them beyond the session.

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { CapturePhoto } from './capture-photo';
import { DeletePhotoButton } from './delete-photo-button';

const BUCKET = 'progress-photos';
const SIGNED_URL_TTL_SECONDS = 60 * 60; // 1 hour

// Days after onboarding when the 90-day photo becomes eligible. Matches
// the feature name and the POVs' visible-change timeline for most
// interventions.
const PROGRESS_WINDOW_DAYS = 90;

type PhotoRow = {
  id: string;
  slot: 'baseline' | 'progress_90d';
  storage_path: string;
  captured_at: string;
  signedUrl: string | null;
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default async function ProgressPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('users')
    .select('onboarding_completed_at')
    .eq('id', user.id)
    .maybeSingle();

  const onboardedAt = profile?.onboarding_completed_at
    ? new Date(profile.onboarding_completed_at as string)
    : null;
  const daysSinceOnboarding = onboardedAt
    ? Math.floor((Date.now() - onboardedAt.getTime()) / 86_400_000)
    : 0;
  const daysUntil90d = Math.max(0, PROGRESS_WINDOW_DAYS - daysSinceOnboarding);
  const progress90dEligible = onboardedAt && daysSinceOnboarding >= PROGRESS_WINDOW_DAYS;

  const { data: rowsRaw } = await supabase
    .from('progress_photos')
    .select('id, slot, storage_path, captured_at')
    .eq('user_id', user.id);

  const rows: PhotoRow[] = await Promise.all(
    (rowsRaw ?? []).map(async (r) => {
      const row = r as {
        id: string;
        slot: 'baseline' | 'progress_90d';
        storage_path: string;
        captured_at: string;
      };
      const { data: signed } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(row.storage_path, SIGNED_URL_TTL_SECONDS);
      return {
        id: row.id,
        slot: row.slot,
        storage_path: row.storage_path,
        captured_at: row.captured_at,
        signedUrl: signed?.signedUrl ?? null,
      };
    }),
  );

  const baseline = rows.find((r) => r.slot === 'baseline') ?? null;
  const progress90d = rows.find((r) => r.slot === 'progress_90d') ?? null;

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="text-3xl font-semibold tracking-tight">Progress photos</h1>
      <p className="mt-3 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
        Two photos, ninety days apart. The comparison is for you — your own
        eyes on your own face. No AI analysis, no ranking, no &ldquo;score.&rdquo;
        You can delete either photo at any time from Settings → Progress photos.
      </p>

      {!baseline && (
        <section className="mt-10">
          <h2 className="text-xl font-semibold tracking-tight">
            Capture your baseline
          </h2>
          <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">
            One front-facing photo in good light. This is the reference point
            your 90-day photo will sit next to.
          </p>
          <div className="mt-5">
            <CapturePhoto slot="baseline" />
          </div>
        </section>
      )}

      {baseline && !progress90d && !progress90dEligible && (
        <section className="mt-10">
          <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                  Baseline · {formatDate(baseline.captured_at)}
                </div>
                {baseline.signedUrl && (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={baseline.signedUrl}
                    alt="Baseline"
                    className="mt-3 w-full rounded-lg object-cover"
                  />
                )}
              </div>
              <div className="flex flex-col justify-center">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                  90-day photo
                </div>
                <p className="mt-3 text-sm text-zinc-700 dark:text-zinc-300">
                  Available in <strong>{daysUntil90d}</strong>{' '}
                  {daysUntil90d === 1 ? 'day' : 'days'}. We&rsquo;ll surface a
                  capture prompt here and on Today when the window opens.
                </p>
                <p className="mt-2 text-xs text-zinc-500">
                  Ninety days matches the POVs&rsquo; typical visible-change
                  windows — earlier is mostly puffiness and noise.
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      {baseline && !progress90d && progress90dEligible && (
        <section className="mt-10 space-y-6">
          <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
              Baseline · {formatDate(baseline.captured_at)}
            </div>
            {baseline.signedUrl && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={baseline.signedUrl}
                alt="Baseline"
                className="mt-3 w-full rounded-lg object-cover sm:max-w-sm"
              />
            )}
          </div>
          <div>
            <h2 className="text-xl font-semibold tracking-tight">
              Capture your 90-day photo
            </h2>
            <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">
              Match the conditions as closely as you can — same lighting, same
              angle, neutral expression. That&rsquo;s what makes the comparison
              honest.
            </p>
            <div className="mt-5">
              <CapturePhoto slot="progress_90d" />
            </div>
          </div>
        </section>
      )}

      {baseline && progress90d && (
        <section className="mt-10">
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                Baseline · {formatDate(baseline.captured_at)}
              </div>
              {baseline.signedUrl && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={baseline.signedUrl}
                  alt="Baseline"
                  className="mt-3 w-full rounded-lg object-cover"
                />
              )}
              <div className="mt-3">
                <DeletePhotoButton photoId={baseline.id} label="Delete baseline" />
              </div>
            </div>
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                90-day · {formatDate(progress90d.captured_at)}
              </div>
              {progress90d.signedUrl && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={progress90d.signedUrl}
                  alt="90-day"
                  className="mt-3 w-full rounded-lg object-cover"
                />
              )}
              <div className="mt-3">
                <DeletePhotoButton photoId={progress90d.id} label="Delete 90-day" />
              </div>
            </div>
          </div>
          <div className="mt-6 rounded-xl border border-zinc-200 bg-zinc-50 p-5 text-sm leading-relaxed text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
            <strong className="font-medium text-zinc-900 dark:text-zinc-100">
              What to look for:
            </strong>{' '}
            skin clarity, under-eye puffiness, facial leanness, overall alertness.
            Day-to-day variance is normal — a bad sleep night can show up. The
            signal is the broad pattern, not the small differences.
          </div>
        </section>
      )}
    </main>
  );
}
