// Reusable milestone surface for one photo category (face or body).
// Renders the 4-card grid (baseline / 30d / 90d / 180d), the side-by-
// side compare with optional AI analysis, the conditional "capture
// your N-day photo" prompts when an eligibility window has opened,
// and the per-category "what to look for" reminder.
//
// This is a server component — eligibility math runs once per
// request, alongside the row lookup happening in the parent page.

import { CapturePhoto } from '../profile/capture-photo';
import { DeletePhotoButton } from '../profile/delete-photo-button';
import { AngleSlot } from '../profile/angle-slot';
import { PhotoCompare } from '../profile/photo-compare';

type Slot = 'baseline' | 'progress_30d' | 'progress_90d' | 'progress_180d';
type Angle = 'front' | 'close' | 'side' | 'back';
type Category = 'face' | 'body';

export type MilestonePhotoRow = {
  id: string;
  slot: Slot;
  angle: Angle;
  storage_path: string;
  captured_at: string;
  signedUrl: string | null;
};

type Props = {
  category: Category;
  rows: MilestonePhotoRow[];
  timezone: string;
  isPremium: boolean;
  // Days since onboarding completion. Drives milestone eligibility
  // for non-baseline slots. When the user has not completed
  // onboarding, the parent should pass 0 — only baseline becomes
  // capturable.
  daysSinceOnboarding: number;
  // True if onboarding is complete. Required for any milestone past
  // baseline to be eligible at all.
  hasOnboarded: boolean;
};

const MID_WINDOW_DAYS = 30;
const PROGRESS_WINDOW_DAYS = 90;
const LATE_WINDOW_DAYS = 180;

// Optional angles per category. Front is always the main capture
// (handled by CapturePhoto, not AngleSlot).
const OPTIONAL_ANGLES: Record<Category, ReadonlyArray<'close' | 'side' | 'back'>> = {
  face: ['close', 'side'],
  body: ['side', 'back'],
};

const CATEGORY_HEADING: Record<Category, string> = {
  face: 'Face photos',
  body: 'Full-body photos',
};

const WHAT_TO_LOOK_FOR: Record<Category, string> = {
  face:
    'skin clarity, under-eye puffiness, facial leanness, overall alertness. Day-to-day variance is normal — a bad sleep night can show up. The signal is the broad pattern, not the small differences.',
  body:
    'posture, muscle definition, overall body composition, how clothing sits. Day-to-day fluctuation in lighting, water retention, and stance shows up — the signal is the broad pattern, not the small differences.',
};

function formatDate(iso: string, timezone: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: timezone,
  });
}

export function PhotoMilestoneGrid({
  category,
  rows,
  timezone,
  isPremium,
  daysSinceOnboarding,
  hasOnboarded,
}: Props) {
  // Indexed lookup so each card can find its specific (slot, angle)
  // row without re-scanning the array.
  const bySlotAngle = new Map<string, MilestonePhotoRow>();
  for (const r of rows) bySlotAngle.set(`${r.slot}|${r.angle}`, r);
  const findPhoto = (slot: Slot, angle: Angle) =>
    bySlotAngle.get(`${slot}|${angle}`) ?? null;

  const baseline = findPhoto('baseline', 'front');
  const progress30d = findPhoto('progress_30d', 'front');
  const progress90d = findPhoto('progress_90d', 'front');
  const progress180d = findPhoto('progress_180d', 'front');

  const daysUntil30d = Math.max(0, MID_WINDOW_DAYS - daysSinceOnboarding);
  const daysUntil90d = Math.max(0, PROGRESS_WINDOW_DAYS - daysSinceOnboarding);
  const daysUntil180d = Math.max(0, LATE_WINDOW_DAYS - daysSinceOnboarding);
  const progress30dEligible = hasOnboarded && daysSinceOnboarding >= MID_WINDOW_DAYS;
  const progress90dEligible = hasOnboarded && daysSinceOnboarding >= PROGRESS_WINDOW_DAYS;
  const progress180dEligible = hasOnboarded && daysSinceOnboarding >= LATE_WINDOW_DAYS;

  const optionalAngles = OPTIONAL_ANGLES[category];
  const heading = CATEGORY_HEADING[category];
  const showAnalysis = category === 'face';

  return (
    <section>
      <h2 className="text-2xl font-semibold tracking-tight">{heading}</h2>

      {!baseline && (
        <div className="mt-6">
          <p className="mb-3 text-sm text-zinc-700 dark:text-zinc-300">
            {category === 'body'
              ? 'A full-body baseline. Reference point for the next six months. Match conditions when you take later photos — same lighting, same clothing, same standpoint.'
              : 'One front-facing photo of your face in good light. Reference point your later photos will sit next to.'}
          </p>
          <CapturePhoto slot="baseline" category={category} />
        </div>
      )}

      {baseline && (
        <div className="mt-6 grid gap-6 grid-cols-2 sm:grid-cols-4">
          {/* Baseline */}
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
              Baseline &middot; {formatDate(baseline.captured_at, timezone)}
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
            <div className="mt-3 border-t border-zinc-100 pt-2 dark:border-zinc-800">
              {optionalAngles.map((a) => {
                const row = findPhoto('baseline', a);
                return (
                  <AngleSlot
                    key={a}
                    slot="baseline"
                    angle={a}
                    category={category}
                    existingPhotoId={row?.id ?? null}
                    existingSignedUrl={row?.signedUrl ?? null}
                  />
                );
              })}
            </div>
          </div>

          {/* 30-day */}
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
              {progress30d
                ? `30-day · ${formatDate(progress30d.captured_at, timezone)}`
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
              <>
                <div className="mt-3">
                  <DeletePhotoButton photoId={progress30d.id} label="Delete 30-day" />
                </div>
                <div className="mt-3 border-t border-zinc-100 pt-2 dark:border-zinc-800">
                  {optionalAngles.map((a) => {
                    const row = findPhoto('progress_30d', a);
                    return (
                      <AngleSlot
                        key={a}
                        slot="progress_30d"
                        angle={a}
                        category={category}
                        existingPhotoId={row?.id ?? null}
                        existingSignedUrl={row?.signedUrl ?? null}
                      />
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* 90-day */}
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
              {progress90d
                ? `90-day · ${formatDate(progress90d.captured_at, timezone)}`
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
              <>
                <div className="mt-3">
                  <DeletePhotoButton photoId={progress90d.id} label="Delete 90-day" />
                </div>
                <div className="mt-3 border-t border-zinc-100 pt-2 dark:border-zinc-800">
                  {optionalAngles.map((a) => {
                    const row = findPhoto('progress_90d', a);
                    return (
                      <AngleSlot
                        key={a}
                        slot="progress_90d"
                        angle={a}
                        category={category}
                        existingPhotoId={row?.id ?? null}
                        existingSignedUrl={row?.signedUrl ?? null}
                      />
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* 180-day */}
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
              {progress180d
                ? `180-day · ${formatDate(progress180d.captured_at, timezone)}`
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
              <>
                <div className="mt-3">
                  <DeletePhotoButton photoId={progress180d.id} label="Delete 180-day" />
                </div>
                <div className="mt-3 border-t border-zinc-100 pt-2 dark:border-zinc-800">
                  {optionalAngles.map((a) => {
                    const row = findPhoto('progress_180d', a);
                    return (
                      <AngleSlot
                        key={a}
                        slot="progress_180d"
                        angle={a}
                        category={category}
                        existingPhotoId={row?.id ?? null}
                        existingSignedUrl={row?.signedUrl ?? null}
                      />
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {(() => {
        // Side-by-side compare uses front photos only — close/side/back
        // shots aren't visually intuitive next to each other.
        const usableFront = rows.filter(
          (r): r is typeof r & { signedUrl: string } =>
            r.angle === 'front' && Boolean(r.signedUrl),
        );
        if (usableFront.length < 2) return null;
        return (
          <div className="mt-8">
            <PhotoCompare
              isPremium={isPremium}
              showAnalysis={showAnalysis}
              photos={usableFront.map((r) => ({
                slot: r.slot,
                captured_at: r.captured_at,
                signedUrl: r.signedUrl,
              }))}
            />
          </div>
        );
      })()}

      {baseline && !progress30d && progress30dEligible && !progress90dEligible && (
        <div className="mt-10">
          <h3 className="text-xl font-semibold tracking-tight">
            Capture your 30-day{category === 'body' ? ' body' : ''} photo
          </h3>
          <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">
            Optional mid-point. Match the baseline conditions — same
            lighting, same angle, same standpoint, neutral expression.
            That&rsquo;s what makes the comparison honest.
          </p>
          <div className="mt-5">
            <CapturePhoto
              slot="progress_30d"
              category={category}
              baselineUrl={baseline?.signedUrl ?? null}
            />
          </div>
        </div>
      )}

      {baseline && !progress90d && progress90dEligible && !progress180dEligible && (
        <div className="mt-10 space-y-6">
          <div>
            <h3 className="text-xl font-semibold tracking-tight">
              Capture your 90-day{category === 'body' ? ' body' : ''} photo
            </h3>
            <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">
              Match the conditions as closely as you can — same lighting,
              same angle, same standpoint. That&rsquo;s what makes the
              comparison honest.
            </p>
            <div className="mt-5">
              <CapturePhoto
                slot="progress_90d"
                category={category}
                baselineUrl={baseline?.signedUrl ?? null}
              />
            </div>
          </div>
          {!progress30d && progress30dEligible && (
            <div>
              <h3 className="text-xl font-semibold tracking-tight">
                Still want a 30-day photo?
              </h3>
              <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">
                You can still add one retroactively as a mid-point reference.
              </p>
              <div className="mt-5">
                <CapturePhoto
                  slot="progress_30d"
                  category={category}
                  baselineUrl={baseline?.signedUrl ?? null}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {baseline && !progress180d && progress180dEligible && (
        <div className="mt-10 space-y-6">
          <div>
            <h3 className="text-xl font-semibold tracking-tight">
              Capture your 180-day{category === 'body' ? ' body' : ''} photo
            </h3>
            <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">
              Six months in. Slow-moving variables don&rsquo;t show their
              full effect at 90 days. This is the photo that tells you
              whether the patient interventions are working. Match the
              baseline conditions.
            </p>
            <div className="mt-5">
              <CapturePhoto
                slot="progress_180d"
                category={category}
                baselineUrl={baseline?.signedUrl ?? null}
              />
            </div>
          </div>
          {!progress90d && progress90dEligible && (
            <div>
              <h3 className="text-xl font-semibold tracking-tight">
                Still want a 90-day photo?
              </h3>
              <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">
                You can still add one retroactively as a checkpoint.
              </p>
              <div className="mt-5">
                <CapturePhoto
                  slot="progress_90d"
                  category={category}
                  baselineUrl={baseline?.signedUrl ?? null}
                />
              </div>
            </div>
          )}
          {!progress30d && progress30dEligible && (
            <div>
              <h3 className="text-xl font-semibold tracking-tight">
                Still want a 30-day photo?
              </h3>
              <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">
                You can still add one retroactively as a mid-point reference.
              </p>
              <div className="mt-5">
                <CapturePhoto
                  slot="progress_30d"
                  category={category}
                  baselineUrl={baseline?.signedUrl ?? null}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {baseline && progress90d && (
        <div className="mt-10 rounded-xl border border-zinc-200 bg-zinc-50 p-5 text-sm leading-relaxed text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
          <strong className="font-medium text-zinc-900 dark:text-zinc-100">
            What to look for:
          </strong>{' '}
          {WHAT_TO_LOOK_FOR[category]}
        </div>
      )}
    </section>
  );
}
