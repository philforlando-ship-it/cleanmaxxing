// Nutrition log endpoint. POST upserts a row keyed by (user_id,
// date) so editing today's entry updates rather than duplicates.
// The card on /today supplies its own hydration via getNutritionState
// in the server component; no GET needed yet (mirrors the sleep
// route's shape — GET there is for /profile, which nutrition
// doesn't have a chart for at this point).

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

const PostSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  hit_target: z.boolean(),
  protein_grams: z.number().int().min(0).max(600).nullable().optional(),
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

  const { date, hit_target, protein_grams, notes } = parsed.data;

  const { error } = await supabase.from('nutrition_logs').upsert(
    {
      user_id: user.id,
      date,
      hit_target,
      protein_grams: protein_grams ?? null,
      notes: notes?.trim() || null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,date' },
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
