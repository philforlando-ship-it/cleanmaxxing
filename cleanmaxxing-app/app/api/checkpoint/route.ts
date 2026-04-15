import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { dismissCheckpoint, getCheckpointState } from '@/lib/checkpoint/service';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const state = await getCheckpointState(supabase, user.id);
  return NextResponse.json(state);
}

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await dismissCheckpoint(supabase, user.id);
  return NextResponse.json({ status: 'dismissed' });
}
