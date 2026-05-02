import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import {
  getTodayCheckInState,
  saveTodayCheckIn,
  undoTodayCheckIn,
} from '@/lib/check-in/service';

const PostSchema = z.object({
  goals: z.array(
    z.object({
      goal_id: z.string().uuid(),
      completed: z.boolean(),
    })
  ),
});

// Read the user's stored IANA tz so the day-key for the check-in
// row aligns with whichever timezone they're in. Falls back to
// 'America/New_York' (the migration default) if the row is missing
// for any reason.
async function getUserTimezone(
  supabase: SupabaseClient,
  userId: string,
): Promise<string> {
  const { data } = await supabase
    .from('users')
    .select('timezone')
    .eq('id', userId)
    .maybeSingle();
  return (data?.timezone as string | null) ?? 'America/New_York';
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const timezone = await getUserTimezone(supabase, user.id);
  const state = await getTodayCheckInState(supabase, user.id, timezone);
  return NextResponse.json(state);
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const parsed = PostSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const timezone = await getUserTimezone(supabase, user.id);
  const state = await saveTodayCheckIn(
    supabase,
    user.id,
    parsed.data.goals,
    timezone,
  );
  return NextResponse.json(state);
}

export async function DELETE() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const timezone = await getUserTimezone(supabase, user.id);
  await undoTodayCheckIn(supabase, user.id, timezone);
  const state = await getTodayCheckInState(supabase, user.id, timezone);
  return NextResponse.json(state);
}
