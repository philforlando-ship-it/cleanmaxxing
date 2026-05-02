import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { QUESTIONS } from '@/lib/onboarding/questions';
import { ReviewContinueButton } from './review-continue-button';

// Post-survey "what we know about you" review. The user has handed
// over 12 answers + auto-detected timezone + computed age segment
// without ever seeing the resulting picture. This screen builds
// trust (you can correct anything before goals are picked) and
// authorship (the user feels they shaped their profile, rather
// than being processed by it).
//
// State: this screen runs *after* /api/onboarding/submit has set
// age_segment but *before* /api/goals/accept sets
// onboarding_completed_at. The entry redirector at /onboarding
// routes the user here when age_segment is set but the
// `onboarding_review_acked` marker hasn't been recorded yet.
// Continue persists the marker and forwards to the baseline-photo
// step; Edit links jump back to the corresponding question.

const FOCUS_LABELS: Record<string, string> = {
  fitness: 'Fitness',
  body_composition: 'Body composition',
  skin: 'Skin',
  hair: 'Hair',
  facial_aesthetics: 'Facial aesthetics',
  style: 'Style',
  posture: 'Posture',
  grooming: 'Grooming',
  anti_aging: 'Anti-aging',
};

const MOTIVATION_LABELS: Record<string, string> = {
  'feel-better-in-own-skin': 'Feel better in my own skin',
  'social-professional-confidence': 'Social or professional confidence',
  'specific-event': 'Preparing for a specific event',
  'structured-plan': 'Want a structured plan',
  'something-specific-bothering-me': 'Something specific bothering me',
  'maintenance-aging': 'Maintain looks, defend against aging',
  'not-sure-yet': 'Not sure yet',
};

const AGE_FEEL_LABELS: Record<string, string> = {
  '2': 'Much older than my age',
  '4': 'A bit older than my age',
  '6': 'About my age',
  '8': 'A bit younger than my age',
  '10': 'Much younger than my age',
};

function decodeFocusAreas(raw: string | null): string {
  if (!raw) return '—';
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return '—';
    const labels = parsed
      .map((v) => FOCUS_LABELS[v as string] ?? (v as string))
      .filter(Boolean);
    return labels.join(', ') || '—';
  } catch {
    return '—';
  }
}

function questionStepIndex(key: string): number {
  return QUESTIONS.findIndex((q) => q.key === key);
}

export default async function OnboardingReviewPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('users')
    .select('age, age_segment, timezone, motivation_segment, motivation_specific_detail, onboarding_completed_at')
    .eq('id', user.id)
    .maybeSingle();
  // Past goal pickup already? Forward to /today.
  if (profile?.onboarding_completed_at) redirect('/today');
  // Hit this URL before submitting? Bounce back to the survey
  // entry redirector, which will route to wherever the user is.
  if (!profile?.age_segment) redirect('/onboarding');

  const { data: rows } = await supabase
    .from('survey_responses')
    .select('question_key, response_value')
    .eq('user_id', user.id);
  const byKey = new Map<string, string>(
    (rows ?? []).map((r) => [
      r.question_key as string,
      (r.response_value as string | null) ?? '',
    ]),
  );

  // Already acked? Forward to baseline-photo. Idempotent so a
  // direct revisit doesn't loop the user.
  if (byKey.get('onboarding_review_acked') === '1') {
    redirect('/onboarding/baseline-photo');
  }

  const motivation = profile.motivation_segment as string | null;
  const motivationLabel = motivation
    ? MOTIVATION_LABELS[motivation] ?? motivation
    : '—';
  const motivationDetail = profile.motivation_specific_detail as string | null;

  const ageFeelRaw = byKey.get('confidence_appearance') ?? '';
  const ageFeelLabel = AGE_FEEL_LABELS[ageFeelRaw] ?? ageFeelRaw;

  const ninetyDay = byKey.get('ninety_day_intent')?.trim();
  const specificThing = byKey.get('specific_thing')?.trim();
  const heightVal = byKey.get('height_inches');
  const weightVal = byKey.get('weight_lbs');

  type Row = {
    label: string;
    value: string;
    questionKey: string | null;
  };
  const rowsForRender: Row[] = [
    { label: 'Age', value: profile.age ? String(profile.age) : '—', questionKey: 'age' },
    { label: 'Height', value: heightVal || '—', questionKey: 'height_inches' },
    { label: 'Weight (lbs)', value: weightVal || '—', questionKey: 'weight_lbs' },
    {
      label: 'Why you’re here',
      value: motivationDetail
        ? `${motivationLabel} — ${motivationDetail}`
        : motivationLabel,
      questionKey: 'motivation_segment',
    },
    {
      label: 'Focus areas',
      value: decodeFocusAreas(byKey.get('focus_areas') ?? null),
      questionKey: 'focus_areas',
    },
    {
      label: 'Specific thing on your mind',
      value: specificThing || '—',
      questionKey: 'specific_thing',
    },
    {
      label: 'Social confidence (1–10)',
      value: byKey.get('confidence_social') || '—',
      questionKey: 'confidence_social',
    },
    {
      label: 'Work / daily-life confidence (1–10)',
      value: byKey.get('confidence_work') || '—',
      questionKey: 'confidence_work',
    },
    {
      label: 'Physical confidence (1–10)',
      value: byKey.get('confidence_physical') || '—',
      questionKey: 'confidence_physical',
    },
    {
      label: 'Age-feel',
      value: ageFeelLabel || '—',
      questionKey: 'confidence_appearance',
    },
    {
      label: '90-day intent',
      value: ninetyDay || '—',
      questionKey: 'ninety_day_intent',
    },
  ];

  const ageSegment = (profile.age_segment as string | null) ?? '—';
  const timezone = (profile.timezone as string | null) ?? 'America/New_York';

  return (
    <main className="mx-auto flex min-h-[100svh] max-w-xl flex-col px-6 py-10">
      <div className="flex flex-1 flex-col">
        <h1 className="text-2xl font-semibold leading-tight tracking-tight">
          Here&rsquo;s what we have so far.
        </h1>
        <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
          Quick check before we pick goals. Anything off, edit it now —
          easier than later.
        </p>

        <dl className="mt-8 divide-y divide-zinc-200 rounded-xl border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
          {rowsForRender.map((row) => {
            const stepIdx = row.questionKey ? questionStepIndex(row.questionKey) : -1;
            return (
              <div
                key={row.label}
                className="flex items-start justify-between gap-4 px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <dt className="text-xs uppercase tracking-wide text-zinc-500">
                    {row.label}
                  </dt>
                  <dd className="mt-0.5 break-words text-sm text-zinc-900 dark:text-zinc-100">
                    {row.value}
                  </dd>
                </div>
                {stepIdx >= 0 && (
                  <Link
                    href={`/onboarding/${stepIdx}`}
                    className="shrink-0 text-xs text-zinc-500 underline decoration-dotted underline-offset-2 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
                  >
                    Edit
                  </Link>
                )}
              </div>
            );
          })}
        </dl>

        <div className="mt-6 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Auto-detected
          </h2>
          <ul className="mt-2 space-y-1 text-sm text-zinc-800 dark:text-zinc-200">
            <li>
              Age segment:{' '}
              <span className="font-medium">{ageSegment}</span>
            </li>
            <li>
              Timezone:{' '}
              <span className="font-medium">{timezone}</span>{' '}
              <span className="text-xs text-zinc-500">
                (used for 3 a.m. day-rollover; updates silently if it
                changes)
              </span>
            </li>
          </ul>
        </div>

        <div className="mt-8 flex items-center justify-end">
          <ReviewContinueButton />
        </div>
      </div>
    </main>
  );
}
