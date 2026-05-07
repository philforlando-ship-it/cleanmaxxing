import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { CapturePhoto } from '@/app/(app)/profile/capture-photo';
import { BaselinePhotoSkipButton } from './baseline-photo-skip-button';
import { BaselineExtrasContinueButton } from './baseline-extras-continue-button';

// Optional baseline-photo capture as the actual last onboarding step.
// The 30/90/180 day comparison surfaces are dead unless a baseline
// exists, and inline-during-onboarding compliance is dramatically
// higher than the post-onboarding /today nudge that previously was
// the only path.
//
// Two phases on this page:
//   Phase 1 — front face capture. The canonical baseline. Skip
//             affordance is large; if the user skips, the marker is
//             set and we continue.
//   Phase 2 — optional extras (close-up face, side profile, body
//             front). Only surfaces AFTER the front face is captured.
//             Each is independently optional. The user clicks
//             "Continue" to set the marker and move on.
//
// The marker (onboarding_baseline_acked) is the explicit "I'm done
// with this step" signal — distinct from the photo presence. Phase 1
// presence alone no longer auto-redirects, so the user can stay on
// the page to capture extras.

export default async function OnboardingBaselinePhotoPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('users')
    .select('age_segment, onboarding_completed_at')
    .eq('id', user.id)
    .maybeSingle();
  if (profile?.onboarding_completed_at) redirect('/today');
  if (!profile?.age_segment) redirect('/onboarding');

  const [{ data: markerRows }, { data: photoRows }] = await Promise.all([
    supabase
      .from('survey_responses')
      .select('question_key, response_value')
      .eq('user_id', user.id)
      .in('question_key', [
        'onboarding_review_acked',
        'onboarding_baseline_acked',
      ]),
    // All baseline-slot photos (any angle / category) so the page
    // can render thumbnails of what's already captured AND know
    // whether the front-face baseline (the gated one) exists.
    supabase
      .from('progress_photos')
      .select('id, slot, angle, category')
      .eq('user_id', user.id)
      .eq('slot', 'baseline'),
  ]);

  const markers = new Map<string, string>(
    (markerRows ?? []).map((r) => [
      r.question_key as string,
      (r.response_value as string | null) ?? '',
    ]),
  );
  if (markers.get('onboarding_review_acked') !== '1') {
    redirect('/onboarding/review');
  }

  // Marker set = step is done (whether the user skipped or captured).
  // Bounce to the welcome page.
  if (markers.get('onboarding_baseline_acked') === '1') {
    redirect('/onboarding/complete');
  }

  type PhotoRow = {
    id: string;
    slot: string;
    angle: string;
    category: string;
  };
  const photos = (photoRows ?? []) as PhotoRow[];
  const hasFaceFront = photos.some(
    (p) => p.angle === 'front' && p.category === 'face',
  );
  const hasFaceClose = photos.some(
    (p) => p.angle === 'close' && p.category === 'face',
  );
  const hasFaceSide = photos.some(
    (p) => p.angle === 'side' && p.category === 'face',
  );
  const hasBodyFront = photos.some(
    (p) => p.angle === 'front' && p.category === 'body',
  );

  return (
    <main className="mx-auto flex min-h-[100svh] max-w-xl flex-col px-6 py-10">
      <div className="flex flex-1 flex-col">
        <div className="mb-4 text-xs uppercase tracking-wider text-zinc-500">
          Last optional step
        </div>
        <h1 className="text-2xl font-semibold leading-tight tracking-tight">
          {hasFaceFront
            ? 'Want to capture more angles?'
            : 'Want to capture a baseline photo now?'}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          {hasFaceFront
            ? 'Front baseline is in. Optional extras below — close-up, side profile, full-body front. Each one improves what Mister P can do later. All optional, skip anything you don’t want.'
            : 'One front-facing photo of your face becomes your reference point in 30, 90, and 180 days. The comparison is for you to see. Stored privately, deletable any time.'}
        </p>

        {/* Phase 1 — front face capture (gated). Disappears once
            captured; replaced by the extras flow below. */}
        {!hasFaceFront && (
          <>
            <div className="mt-8">
              <CapturePhoto
                slot="baseline"
                category="face"
                angle="front"
              />
            </div>

            <div className="mt-10 flex items-center justify-between gap-3">
              <BaselinePhotoSkipButton />
              <span className="text-xs text-zinc-500">
                Or upload above to capture, then continue.
              </span>
            </div>
          </>
        )}

        {/* Phase 2 — optional extras. Surfaced only after front face
            is captured. Each is independently skippable; "Continue"
            below sets the marker regardless of which extras are
            captured. */}
        {hasFaceFront && (
          <>
            <div className="mt-8 space-y-6">
              {!hasFaceClose && (
                <ExtraSection
                  label="Face close-up (optional)"
                  helper="Tighter framing — eyes, nose, mouth, skin. Powers premium AI facial analysis comparisons later."
                >
                  <CapturePhoto
                    slot="baseline"
                    category="face"
                    angle="close"
                  />
                </ExtraSection>
              )}
              {!hasFaceSide && (
                <ExtraSection
                  label="Face side profile (optional)"
                  helper="Jaw + neck + temple line. Reveals what the front shot can’t."
                >
                  <CapturePhoto
                    slot="baseline"
                    category="face"
                    angle="side"
                  />
                </ExtraSection>
              )}
              {!hasBodyFront && (
                <ExtraSection
                  label="Full-body front (optional)"
                  helper="Standing, fitted or minimal clothing, neutral pose. Body composition comparisons hang off this."
                >
                  <CapturePhoto
                    slot="baseline"
                    category="body"
                    angle="front"
                  />
                </ExtraSection>
              )}
              {hasFaceClose && hasFaceSide && hasBodyFront && (
                <p className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
                  All four angles captured. Best baseline you can give
                  Mister P. Hit continue.
                </p>
              )}
            </div>

            <div className="mt-10">
              <BaselineExtrasContinueButton />
            </div>
          </>
        )}
      </div>
    </main>
  );
}

function ExtraSection({
  label,
  helper,
  children,
}: {
  label: string;
  helper: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h2 className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
        {label}
      </h2>
      <p className="mt-1 text-[13px] text-zinc-500 dark:text-zinc-400">
        {helper}
      </p>
      <div className="mt-3">{children}</div>
    </div>
  );
}
