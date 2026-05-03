// /profile page — bio, stats, time zone, and personal info. Photos
// live at /photos under their own top-level nav item.

import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { CurrentStatsForm } from './current-stats-form';
import { ProfileForm } from './profile-form';
import { TimezoneForm } from './timezone-form';
import { getUserProfile } from '@/lib/profile/service';

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('users')
    .select('timezone')
    .eq('id', user.id)
    .maybeSingle();
  const timezone =
    (profile?.timezone as string | null) ?? 'America/New_York';

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
        Current stats and personal info. Mister P uses these to calibrate
        his answers in your specific case rather than the generic case.
        Everything is private; you can leave any of it blank.{' '}
        <Link
          href="/photos"
          className="underline hover:text-zinc-900 dark:hover:text-zinc-100"
        >
          Photos live under their own tab.
        </Link>
      </p>

      <section className="mt-12">
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
        <h2 className="text-xl font-semibold tracking-tight">Time zone</h2>
        <p className="mt-2 max-w-xl text-sm text-zinc-700 dark:text-zinc-300">
          Sets when each new day starts for your check-in, sleep, and
          workout logs. The day rolls over at 3 a.m. local — a 1 a.m.
          log still belongs to yesterday.
        </p>
        <div className="mt-6">
          <TimezoneForm initial={timezone} />
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
