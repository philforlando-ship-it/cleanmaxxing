// /photos page — the user's complete photo surface. Two sections:
//
//   1. Face photos — baseline + 30/90/180 milestones with optional
//      close-up and side-profile angles. Premium AI facial-analysis
//      runs against these.
//   2. Full-body photos — same milestone cadence with optional side
//      and back angles. Visual comparison only; never sent to any AI.
//
// Server component so signed URLs are minted at request time and
// don't travel through long-lived client caches.

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getPremiumStatus } from '@/lib/billing/is-premium';
import {
  PhotoMilestoneGrid,
  type MilestonePhotoRow,
} from './photo-milestone-grid';

const BUCKET = 'progress-photos';
const SIGNED_URL_TTL_SECONDS = 60 * 60; // 1 hour

type PhotoSlot = 'baseline' | 'progress_30d' | 'progress_90d' | 'progress_180d';
type PhotoAngle = 'front' | 'close' | 'side' | 'back';
type PhotoCategory = 'face' | 'body';

type RawPhotoRow = MilestonePhotoRow & { category: PhotoCategory };

export default async function PhotosPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('users')
    .select('onboarding_completed_at, timezone')
    .eq('id', user.id)
    .maybeSingle();

  const timezone =
    (profile?.timezone as string | null) ?? 'America/New_York';

  const onboardedAt = profile?.onboarding_completed_at
    ? new Date(profile.onboarding_completed_at as string)
    : null;
  const daysSinceOnboarding = onboardedAt
    ? Math.floor((Date.now() - onboardedAt.getTime()) / 86_400_000)
    : 0;
  const hasOnboarded = Boolean(onboardedAt);

  const { data: rowsRaw } = await supabase
    .from('progress_photos')
    .select('id, slot, angle, category, storage_path, captured_at')
    .eq('user_id', user.id);

  const allRows: RawPhotoRow[] = await Promise.all(
    (rowsRaw ?? []).map(async (r) => {
      const row = r as {
        id: string;
        slot: PhotoSlot;
        angle: PhotoAngle;
        category: PhotoCategory;
        storage_path: string;
        captured_at: string;
      };
      const { data: signed } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(row.storage_path, SIGNED_URL_TTL_SECONDS);
      return {
        id: row.id,
        slot: row.slot,
        angle: row.angle,
        category: row.category,
        storage_path: row.storage_path,
        captured_at: row.captured_at,
        signedUrl: signed?.signedUrl ?? null,
      };
    }),
  );

  const faceRows = allRows.filter((r) => r.category === 'face');
  const bodyRows = allRows.filter((r) => r.category === 'body');

  const { isPremium } = await getPremiumStatus(user.id);

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="text-3xl font-semibold tracking-tight">Photos</h1>
      <p className="mt-3 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
        Reference points across six months. Face photos can power a
        Premium qualitative observational read; full-body photos are
        for your own visual comparison only.
      </p>

      <div className="mt-12">
        <PhotoMilestoneGrid
          category="face"
          rows={faceRows}
          timezone={timezone}
          isPremium={isPremium}
          daysSinceOnboarding={daysSinceOnboarding}
          hasOnboarded={hasOnboarded}
        />
      </div>

      <div className="mt-16 border-t border-zinc-200 pt-12 dark:border-zinc-800">
        <PhotoMilestoneGrid
          category="body"
          rows={bodyRows}
          timezone={timezone}
          isPremium={isPremium}
          daysSinceOnboarding={daysSinceOnboarding}
          hasOnboarded={hasOnboarded}
        />
      </div>
    </main>
  );
}
