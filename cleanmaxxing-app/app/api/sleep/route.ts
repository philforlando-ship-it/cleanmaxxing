// Sleep log endpoints. POST upserts a row keyed by (user_id,
// night_of) so editing the same night updates rather than
// duplicates. GET returns recent logs (last 30) for chart
// rendering on /profile. The card on /today supplies its own
// hydration via getSleepState in the server component.

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

const PostSchema = z.object({
  // YYYY-MM-DD, validated to a strict shape so a malformed client
  // can't write garbage into night_of.
  night_of: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  hours: z.number().min(0).max(14),
  quality_1_5: z.number().int().min(1).max(5).nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
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

  const { night_of, hours, quality_1_5, notes } = parsed.data;

  const { error } = await supabase
    .from('sleep_logs')
    .upsert(
      {
        user_id: user.id,
        night_of,
        hours: Math.round(hours * 10) / 10,
        quality_1_5: quality_1_5 ?? null,
        notes: notes?.trim() || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,night_of' },
    );

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
    .from('sleep_logs')
    .select('night_of, hours, quality_1_5, notes')
    .eq('user_id', user.id)
    .order('night_of', { ascending: false })
    .limit(30);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ logs: data ?? [] });
}
