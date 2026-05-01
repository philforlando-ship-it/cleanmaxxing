// Workout log endpoints. POST inserts a new row (no upsert —
// multiple sessions in a day are valid). GET returns the last
// 30 sessions for chart/history rendering.

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

const LiftSchema = z.object({
  name: z.string().min(1).max(100),
  sets: z.number().int().min(0).max(50).nullable().optional(),
  reps: z.number().int().min(0).max(1000).nullable().optional(),
  weight_lbs: z.number().min(0).max(2000).nullable().optional(),
});

const PostSchema = z.object({
  performed_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  type: z.enum(['strength', 'cardio', 'mobility', 'other']),
  duration_min: z.number().int().min(0).max(480).nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
  lifts: z.array(LiftSchema).max(50).optional(),
});

export async function POST(req: NextRequest) {
  const parsed = PostSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { performed_on, type, duration_min, notes, lifts } = parsed.data;

  const { error } = await supabase.from('workout_logs').insert({
    user_id: user.id,
    performed_on,
    type,
    duration_min: duration_min ?? null,
    notes: notes?.trim() || null,
    lifts: lifts ?? [],
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('workout_logs')
    .select('id, performed_on, type, duration_min, notes, lifts')
    .eq('user_id', user.id)
    .order('performed_on', { ascending: false })
    .limit(30);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ logs: data ?? [] });
}
