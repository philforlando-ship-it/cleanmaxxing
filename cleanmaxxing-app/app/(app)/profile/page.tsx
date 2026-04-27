import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getUserProfile } from '@/lib/profile/service';
import { ProfileForm } from './profile-form';

export const metadata = {
  title: 'Profile — Cleanmaxxing',
};

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const profile = await getUserProfile(supabase, user.id);

  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-12">
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
        Profile
      </h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        Optional fields that help Mister P answer in your specific case
        rather than the generic case. Everything is private and you can
        leave any of it blank.
      </p>
      <div className="mt-8">
        <ProfileForm initial={profile} />
      </div>
    </main>
  );
}
