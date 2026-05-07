// Facial-hair groom log endpoint. POST appends a row — append-only
// because a groom event either happened or didn't, you don't edit
// it after the fact.

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { recordFacialHairGroom } from '@/lib/facial-hair/groom-service';

const PostSchema = z.object({
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

  try {
    await recordFacialHairGroom(supabase, user.id, parsed.data.notes ?? null);
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
