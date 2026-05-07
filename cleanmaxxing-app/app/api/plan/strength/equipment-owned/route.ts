// POST /api/plan/strength/equipment-owned
// Persists the buying-list checklist. Slugs validated against the
// gear catalog at the service layer. No report regeneration.

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { saveEquipmentOwned } from '@/lib/strength/service';

const PostSchema = z.object({
  // Strings are trusted-but-validated downstream. Cap matches the
  // gear catalog size to keep the payload sane.
  equipment_owned: z.array(z.string()).max(50),
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
    await saveEquipmentOwned(supabase, user.id, parsed.data.equipment_owned);
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
