// Try-on retention — keep at most N rows per (user, key) and delete
// the storage objects for trimmed rows. Both AI try-on routes (hair
// + facial-hair) call this after a successful insert so the table
// doesn't grow unbounded under the rate limit.
//
// Per-key (vs flat per-user) so a user who explores many cut families
// keeps a useful history per family instead of having older
// generations of one cut bumped by newer generations of another.

import type { SupabaseClient } from '@supabase/supabase-js';

export const TRY_ON_KEEP_PER_KEY = 5;

const BUCKET = 'progress-photos';

type Row = {
  id: string;
  storage_path: string;
};

export async function trimTryOnHistory(
  service: SupabaseClient,
  args: {
    table: 'hair_try_ons' | 'facial_hair_try_ons';
    keyColumn: 'cut_family' | 'target_style';
    keyValue: string;
    userId: string;
  },
): Promise<void> {
  // Pull every row for this (user, key) ordered newest-first; delete
  // anything past the keep window. Doing this in two steps (fetch +
  // delete) instead of a single SQL delete-with-subselect because
  // PostgREST doesn't expose ORDER BY + OFFSET inside DELETE.
  const { data: rows, error } = await service
    .from(args.table)
    .select('id, storage_path')
    .eq('user_id', args.userId)
    .eq(args.keyColumn, args.keyValue)
    .order('created_at', { ascending: false });

  if (error || !rows || rows.length <= TRY_ON_KEEP_PER_KEY) return;

  const toTrim = (rows as Row[]).slice(TRY_ON_KEEP_PER_KEY);
  if (toTrim.length === 0) return;

  // Delete storage objects first — if storage delete fails we still
  // proceed with the row delete to keep the table bounded; orphan
  // storage objects are reclaimable by a separate sweep, orphan
  // table rows pointing at deleted storage are not recoverable. The
  // .catch is defensive against transient storage errors not failing
  // the user's request.
  await service.storage
    .from(BUCKET)
    .remove(toTrim.map((r) => r.storage_path))
    .catch(() => {});

  await service
    .from(args.table)
    .delete()
    .in(
      'id',
      toTrim.map((r) => r.id),
    );
}
