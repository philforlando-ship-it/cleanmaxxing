// /profile page — the user's "where I am right now" surface. Photos
// (baseline → 30d → 90d → 180d), Tier 1 self-report stats (training,
// sleep, weight, body comp, diet, height), and Tier 2 preferences
// (hair, skin, current interventions, budget, relationship). Server
// component so the photo signed URLs stay short-lived and don't
// travel through client code that could cache them beyond the session.

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { CapturePhoto } from './capture-photo';
import { DeletePhotoButton } from './delete-photo-button';
import { CurrentStatsForm } from './current-stats-form';
import { ProfileForm } from './profile-form';
import { PhotoCompare } from './photo-compare';
import { getUserProfile } from '@/lib/profile/service';

const BUCKET = 'progress-photos';
const SIGNED_URL_TTL_SECONDS = 60 * 60; // 1 hour

// Photo eligibility windows from onboarding completion.
const MID_WINDOW_DAYS = 30;
const PROGRESS_WINDOW_DAYS = 90;
const LATE_WINDOW_DAYS = 180;

type PhotoSlot = 'baseline' | 'progress_30d' | 'progress_90d' | 'progress_180d';

type PhotoRow = {
  id: string;
  slot: PhotoSlot;
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

export default async function ProfilePage() {
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
  const daysUntil30d = Math.max(0, MID_WINDOW_DAYS - daysSinceOnboarding);
  const daysUntil90d = Math.max(0, PROGRESS_WINDOW_DAYS - daysSinceOnboarding);
  const daysUntil180d = Math.max(0, LATE_WINDOW_DAYS - daysSinceOnboarding);
  const progress30dEligible = onboardedAt && daysSinceOnboarding >= MID_WINDOW_DAYS;
  const progress90dEligible = onboardedAt && daysSinceOnboarding >= PROGRESS_WINDOW_DAYS;
  const progress180dEligible = onboardedAt && daysSinceOnboarding >= LATE_WINDOW_DAYS;

  const { data: rowsRaw } = await supabase
    .from('progress_photos')
    .select('id, slot, storage_path, captured_at')
    .eq('user_id', user.id);

  const rows: PhotoRow[] = await Promise.all(
    (rowsRaw ?? []).map(async (r) => {
      const row = r as {
        id: string;
        slot: PhotoSlot;
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
  const progress30d = rows.find((r) => r.slot === 'progress_30d') ?? null;
  const progress90d = rows.find((r) => r.slot === 'progress_90d') ?? null;
  const progress180d = rows.find((r) => r.slot === 'progress_180d') ?? null;

  // Tier 1 + Tier 2 self-report fields. Loaded server-side so the
  // forms hydrate with whatever the user has previously saved.
  const userProfile = await getUserProfile(supabase, user.id);

  // Auto-populate weight and height from the onboarding survey when
  // the profile columns are still null. Pure read-time fallback —
  // nothing is written until the user actively saves the form. Once
  // saved, the column is non-null and the fallback path is skipped.
  if (
    userProfile.current_weight_lbs === null ||
    userProfile.height_inches === null
  ) {
    const { data: surveyAnswers } = await supabase
      .from('survey_responses')
      .select('question_key, response_value')
      .eq('user_id', user.id)
      .in('question_key', ['weight_lbs', 'height_inches']);
    const byKey = new Map<string, string>();
    for (const row of surveyAnswers ?? []) {
      const r = row as { question_key: string; response_value: string | null };
      if (r.response_value) byKey.set(r.question_key, r.response_value);
    }
    if (userProfile.current_weight_lbs === null) {
      const raw = byKey.get('weight_lbs');
      if (raw) {
        const n = Number(raw);
        if (Number.isFinite(n) && n >= 80 && n <= 500) {
          userProfile.current_weight_lbs = n;
        }
      }
    }
    if (userProfile.height_inches === null) {
      const raw = byKey.get('height_inches');
      if (raw) {
        const n = Number(raw);
        if (Number.isFinite(n) && n >= 48 && n <= 96) {
          userProfile.height_inches = Math.round(n);
        }
      }
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="text-3xl font-semibold tracking-tight">Profile</h1>
      <p className="mt-3 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
        Photos, current stats, and personal info. Mister P uses these to
        calibrate his answers in your specific case rather than the generic
        case. Everything is private; you can leave any of it blank.
      </p>

      {!baseline && (
        <section className="mt-10">
          <h2 className="text-xl font-semibold tracking-tight">
            Capture your baseline photo
          </h2>
          <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">
            One front-facing photo in good light. This is the reference point
            your later photos will sit next to.
          </p>
          <div className="mt-5">
            <CapturePhoto slot="baseline" />
          </div>
        </section>
      )}

      {baseline && (
        <section className="mt-10">
          <h2 className="text-xl font-semibold tracking-tight">Your photos</h2>
          <div className="mt-4 grid gap-6 grid-cols-2 sm:grid-cols-4">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                Baseline &middot; {formatDate(baseline.captured_at)}
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
                {progress30d
                  ? `30-day · ${formatDate(progress30d.captured_at)}`
                  : '30-day (optional)'}
              </div>
              {progress30d?.signedUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={progress30d.signedUrl}
                  alt="30-day"
                  className="mt-3 w-full rounded-lg object-cover"
                />
              ) : (
                <div className="mt-3 flex aspect-square w-full items-center justify-center rounded-lg border border-dashed border-zinc-300 text-xs text-zinc-500 dark:border-zinc-700">
                  {progress30dEligible
                    ? 'Not captured yet'
                    : `Available in ${daysUntil30d} ${daysUntil30d === 1 ? 'day' : 'days'}`}
                </div>
              )}
              {progress30d && (
                <div className="mt-3">
                  <DeletePhotoButton photoId={progress30d.id} label="Delete 30-day" />
                </div>
              )}
            </div>
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                {progress90d
                  ? `90-day · ${formatDate(progress90d.captured_at)}`
                  : '90-day'}
              </div>
              {progress90d?.signedUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={progress90d.signedUrl}
                  alt="90-day"
                  className="mt-3 w-full rounded-lg object-cover"
                />
              ) : (
                <div className="mt-3 flex aspect-square w-full items-center justify-center rounded-lg border border-dashed border-zinc-300 text-xs text-zinc-500 dark:border-zinc-700">
                  {progress90dEligible
                    ? 'Not captured yet'
                    : `Available in ${daysUntil90d} ${daysUntil90d === 1 ? 'day' : 'days'}`}
                </div>
              )}
              {progress90d && (
                <div className="mt-3">
                  <DeletePhotoButton photoId={progress90d.id} label="Delete 90-day" />
                </div>
              )}
            </div>
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                {progress180d
                  ? `180-day · ${formatDate(progress180d.captured_at)}`
                  : '180-day'}
              </div>
              {progress180d?.signedUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={progress180d.signedUrl}
                  alt="180-day"
                  className="mt-3 w-full rounded-lg object-cover"
                />
              ) : (
                <div className="mt-3 flex aspect-square w-full items-center justify-center rounded-lg border border-dashed border-zinc-300 text-xs text-zinc-500 dark:border-zinc-700">
                  {progress180dEligible
                    ? 'Not captured yet'
                    : `Available in ${daysUntil180d} ${daysUntil180d === 1 ? 'day' : 'days'}`}
                </div>
              )}
              {progress180d && (
                <div className="mt-3">
                  <DeletePhotoButton photoId={progress180d.id} label="Delete 180-day" />
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Comparison surface — renders when 2+ photos with signed
          URLs are available. Sits between the photo grid and the
          capture-flow sections so users see "your photos → compare
          them → fill in the missing slots" as a natural reading
          order. Photos that failed to sign (rare, transient
          storage issue) are filtered out so the compare picker
          can't reach a broken image. */}
      {(() => {
        const usable = rows.filter(
          (r): r is typeof r & { signedUrl: string } => Boolean(r.signedUrl),
        );
        if (usable.length < 2) return null;
        return (
          <PhotoCompare
            photos={usable.map((r) => ({
              slot: r.slot,
              captured_at: r.captured_at,
              signedUrl: r.signedUrl,
            }))}
          />
        );
      })()}

      {baseline && !progress30d && progress30dEligible && !progress90dEligible && (
        <section className="mt-10">
          <h2 className="text-xl font-semibold tracking-tight">
            Capture your 30-day photo
          </h2>
          <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">
            Optional mid-point. Most visible change still takes the full 90
            days, but having a middle reference point is useful when you get
            there. Match the baseline conditions — same lighting, same angle,
            neutral expression.
          </p>
          <div className="mt-5">
            <CapturePhoto slot="progress_30d" baselineUrl={baseline?.signedUrl ?? null} />
          </div>
        </section>
      )}

      {baseline && !progress90d && progress90dEligible && !progress180dEligible && (
        <section className="mt-10 space-y-6">
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
              <CapturePhoto slot="progress_90d" baselineUrl={baseline?.signedUrl ?? null} />
            </div>
          </div>
          {!progress30d && progress30dEligible && (
            <div>
              <h2 className="text-xl font-semibold tracking-tight">
                Still want a 30-day photo?
              </h2>
              <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">
                You can still add one retroactively as a mid-point reference.
              </p>
              <div className="mt-5">
                <CapturePhoto slot="progress_30d" baselineUrl={baseline?.signedUrl ?? null} />
              </div>
            </div>
          )}
        </section>
      )}

      {baseline && !progress180d && progress180dEligible && (
        <section className="mt-10 space-y-6">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">
              Capture your 180-day photo
            </h2>
            <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">
              Six months in. Slow-moving variables — hair regrowth, late
              aesthetic compounding, sustained recomp — often don&rsquo;t
              show their full effect at 90 days. This is the photo that
              tells you whether the patient interventions are working.
              Match the baseline conditions.
            </p>
            <div className="mt-5">
              <CapturePhoto slot="progress_180d" baselineUrl={baseline?.signedUrl ?? null} />
            </div>
          </div>
          {!progress90d && progress90dEligible && (
            <div>
              <h2 className="text-xl font-semibold tracking-tight">
                Still want a 90-day photo?
              </h2>
              <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">
                You can still add one retroactively as a checkpoint.
              </p>
              <div className="mt-5">
                <CapturePhoto slot="progress_90d" baselineUrl={baseline?.signedUrl ?? null} />
              </div>
            </div>
          )}
          {!progress30d && progress30dEligible && (
            <div>
              <h2 className="text-xl font-semibold tracking-tight">
                Still want a 30-day photo?
              </h2>
              <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">
                You can still add one retroactively as a mid-point reference.
              </p>
              <div className="mt-5">
                <CapturePhoto slot="progress_30d" baselineUrl={baseline?.signedUrl ?? null} />
              </div>
            </div>
          )}
        </section>
      )}

      {baseline && progress90d && (
        <section className="mt-10">
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-5 text-sm leading-relaxed text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
            <strong className="font-medium text-zinc-900 dark:text-zinc-100">
              What to look for:
            </strong>{' '}
            skin clarity, under-eye puffiness, facial leanness, overall alertness.
            Day-to-day variance is normal — a bad sleep night can show up. The
            signal is the broad pattern, not the small differences.
          </div>
        </section>
      )}

      <section className="mt-16 border-t border-zinc-200 pt-10 dark:border-zinc-800">
        <h2 className="text-xl font-semibold tracking-tight">Current stats</h2>
        <p className="mt-2 max-w-xl text-sm text-zinc-700 dark:text-zinc-300">
          Where you are right now — training volume, sleep, body comp, diet
          shape, height, weight. Mister P uses these to calibrate his
          answers. All optional; all editable any time.
        </p>
        <div className="mt-8">
          <CurrentStatsForm initial={userProfile} />
        </div>
      </section>

      <section className="mt-16 border-t border-zinc-200 pt-10 dark:border-zinc-800">
        <h2 className="text-xl font-semibold tracking-tight">Personal info</h2>
        <p className="mt-2 max-w-xl text-sm text-zinc-700 dark:text-zinc-300">
          Hair, skin, anything you&rsquo;re currently on, and a couple of
          context fields that shape what advice fits.
        </p>
        <div className="mt-8">
          <ProfileForm initial={userProfile} />
        </div>
      </section>
    </main>
  );
}
