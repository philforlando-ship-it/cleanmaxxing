import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import {
  getWeeklyReflectionState,
  saveWeeklyReflection,
} from '@/lib/weekly-reflection/service';

const DimSchema = z.number().int().min(1).max(10);

const PostSchema = z.object({
  social_confidence: DimSchema,
  work_confidence: DimSchema,
  physical_confidence: DimSchema,
  appearance_confidence: DimSchema,
  notes: z.string().max(2000).nullable().optional(),
});

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const state = await getWeeklyReflectionState(supabase, user.id);
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

  const { notes, ...dims } = parsed.data;
  const state = await saveWeeklyReflection(supabase, user.id, dims, notes ?? null);
  return NextResponse.json(state);
}
