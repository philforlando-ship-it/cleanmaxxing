import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { CapturePhoto } from '@/app/(app)/profile/capture-photo';
import { BaselinePhotoSkipButton } from './baseline-photo-skip-button';

// Optional baseline-photo capture as the actual last onboarding
// step. The 30/90/180 day comparison surfaces are dead unless a
// baseline exists, and inline-during-onboarding compliance is
// dramatically higher than the post-onboarding /today nudge that
// previously was the only path. We make this the *very* last
// optional step — explicit "skip" is large and easy.
//
// Reuses the existing CapturePhoto component used on /profile so
// the upload path (POST /api/progress-photos/upload with slot=baseline)
// is the same one. Once a baseline row exists the entry redirector
// considers this step done and forwards to /onboarding/complete.

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

  // Markers and existing photo: "done" means either the user has a
  // baseline row OR they explicitly acked the skip. Either way,
  // jump them to goal pickup — re-rendering the prompt would
  // double-ask and feel like nagging.
  const [{ data: markerRows }, { data: photoRow }] = await Promise.all([
    supabase
      .from('survey_responses')
      .select('question_key, response_value')
      .eq('user_id', user.id)
      .in('question_key', [
        'onboarding_review_acked',
        'onboarding_baseline_acked',
      ]),
    supabase
      .from('progress_photos')
      .select('id')
      .eq('user_id', user.id)
      .eq('slot', 'baseline')
      .maybeSingle(),
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
  if (markers.get('onboarding_baseline_acked') === '1' || photoRow) {
    redirect('/onboarding/complete');
  }

  return (
    <main className="mx-auto flex min-h-[100svh] max-w-xl flex-col px-6 py-10">
      <div className="flex flex-1 flex-col">
        <div className="mb-4 text-xs uppercase tracking-wider text-zinc-500">
          Last optional step
        </div>
        <h1 className="text-2xl font-semibold leading-tight tracking-tight">
          Want to capture a baseline photo now?
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          One front-facing photo becomes your reference point in 30, 90, and
          180 days. The comparison is for you to see — no AI analysis,
          stored privately, deletable any time. You can skip and add one
          later, but compliance later is much lower than now.
        </p>

        <div className="mt-8">
          <CapturePhoto slot="baseline" />
        </div>

        <div className="mt-10 flex items-center justify-between gap-3">
          <BaselinePhotoSkipButton />
          <span className="text-xs text-zinc-500">
            Or upload above to capture, then continue.
          </span>
        </div>
      </div>
    </main>
  );
}
