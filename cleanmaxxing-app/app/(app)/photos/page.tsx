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
import { PhotoTimelinePanel, type TimelineItem } from './photo-timeline-panel';

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

  // E2: bulk-mint signed URLs in a single roundtrip instead of N
  // parallel single-URL calls. createSignedUrls returns the URLs
  // ordered by the input paths array; we build a path→URL map for
  // O(1) lookup as we shape the row objects.
  const photoRowsTyped = (rowsRaw ?? []).map(
    (r) =>
      r as {
        id: string;
        slot: PhotoSlot;
        angle: PhotoAngle;
        category: PhotoCategory;
        storage_path: string;
        captured_at: string;
      },
  );
  const paths = photoRowsTyped.map((r) => r.storage_path);
  const signedByPath = new Map<string, string>();
  if (paths.length > 0) {
    const { data: signedList } = await supabase.storage
      .from(BUCKET)
      .createSignedUrls(paths, SIGNED_URL_TTL_SECONDS);
    for (const entry of signedList ?? []) {
      const e = entry as {
        path: string | null;
        signedUrl: string | null;
        error: string | null;
      };
      if (e.path && e.signedUrl) signedByPath.set(e.path, e.signedUrl);
    }
  }
  const allRows: RawPhotoRow[] = photoRowsTyped.map((row) => ({
    id: row.id,
    slot: row.slot,
    angle: row.angle,
    category: row.category,
    storage_path: row.storage_path,
    captured_at: row.captured_at,
    signedUrl: signedByPath.get(row.storage_path) ?? null,
  }));

  const faceRows = allRows.filter((r) => r.category === 'face');
  const bodyRows = allRows.filter((r) => r.category === 'body');

  const { isPremium } = await getPremiumStatus(user.id);

  // Hair-session photos for the timeline. We pull every hair_photo plus
  // its session's captured_at + notes, then sign all paths in one bulk
  // call alongside the face/body URLs we already minted. Sessions
  // without any photos uploaded are silently absent (no rows to join).
  const { data: hairRowsRaw } = await supabase
    .from('hair_photos')
    .select(
      'id, angle, storage_path, captured_at, hair_photo_sessions(captured_at, notes)',
    )
    .eq('user_id', user.id)
    .order('captured_at', { ascending: false });
  type HairRow = {
    id: string;
    angle: string;
    storage_path: string;
    captured_at: string;
    hair_photo_sessions: { captured_at: string; notes: string | null } | null;
  };
  const hairRows = (hairRowsRaw ?? []) as unknown as HairRow[];

  const hairPaths = hairRows.map((r) => r.storage_path);
  const hairSignedByPath = new Map<string, string>();
  if (hairPaths.length > 0) {
    const { data: signedList } = await supabase.storage
      .from(BUCKET)
      .createSignedUrls(hairPaths, SIGNED_URL_TTL_SECONDS);
    for (const entry of signedList ?? []) {
      const e = entry as {
        path: string | null;
        signedUrl: string | null;
        error: string | null;
      };
      if (e.path && e.signedUrl) hairSignedByPath.set(e.path, e.signedUrl);
    }
  }

  const SLOT_LABEL: Record<PhotoSlot, string> = {
    baseline: 'baseline',
    progress_30d: '30-day',
    progress_90d: '90-day',
    progress_180d: '180-day',
  };
  const HAIR_ANGLE_LABEL: Record<string, string> = {
    front: 'front',
    hairline: 'hairline',
    side_left: 'side (left)',
    side_right: 'side (right)',
    crown: 'crown',
    styled: 'styled',
    top_down: 'top-down',
  };

  const timelineItems: TimelineItem[] = [];
  for (const row of allRows) {
    if (!row.signedUrl) continue;
    const kindLabel = row.category === 'face' ? 'Face' : 'Body';
    timelineItems.push({
      id: row.id,
      signedUrl: row.signedUrl,
      label: `${kindLabel} ${SLOT_LABEL[row.slot]} · ${row.angle}`,
      capturedAt: row.captured_at,
      kind: row.category,
    });
  }
  for (const row of hairRows) {
    const url = hairSignedByPath.get(row.storage_path);
    if (!url) continue;
    const angleLabel = HAIR_ANGLE_LABEL[row.angle] ?? row.angle;
    timelineItems.push({
      id: row.id,
      signedUrl: url,
      label: `Hair session · ${angleLabel}`,
      detail: row.hair_photo_sessions?.notes ?? null,
      capturedAt: row.captured_at,
      kind: 'hair',
    });
  }

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

      <div className="mt-16 border-t border-zinc-200 pt-12 dark:border-zinc-800">
        <PhotoTimelinePanel items={timelineItems} timezone={timezone} />
      </div>
    </main>
  );
}
