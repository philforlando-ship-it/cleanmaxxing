import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
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

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const state = await getTodayCheckInState(supabase, user.id);
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

  const state = await saveTodayCheckIn(supabase, user.id, parsed.data.goals);
  return NextResponse.json(state);
}

export async function DELETE() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await undoTodayCheckIn(supabase, user.id);
  const state = await getTodayCheckInState(supabase, user.id);
  return NextResponse.json(state);
}
