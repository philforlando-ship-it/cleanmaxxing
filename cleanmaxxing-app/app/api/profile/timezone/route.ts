// Update the user's IANA timezone on `public.users.timezone`.
// Called by:
//   - components/timezone-sync.tsx (silent browser-detect on mount)
//   - app/(app)/profile/timezone-form.tsx (explicit dropdown change)
//
// Validation is lenient by design — Intl.DateTimeFormat itself is
// the canonical IANA validator, and the helpers in lib/date/app-day.ts
// fall back gracefully when an unknown zone is passed. We only
// gate length and shape here to keep junk out of the column.

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

const RequestSchema = z.object({
  timezone: z
    .string()
    .min(1)
    .max(64)
    // Either an IANA "Area/Location" (one or two slashes) or
    // bare "UTC". Lenient — the JS Intl runtime is the real check.
    .regex(/^(?:UTC|[A-Za-z_]+\/[A-Za-z_+-]+(?:\/[A-Za-z_+-]+)?)$/),
});

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const parsed = RequestSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid timezone' },
      { status: 400 },
    );
  }

  const { error } = await supabase
    .from('users')
    .update({ timezone: parsed.data.timezone })
    .eq('id', user.id);
  if (error) {
    return NextResponse.json(
      { error: 'Failed to save timezone' },
      { status: 500 },
    );
  }

  return NextResponse.json({ timezone: parsed.data.timezone });
}
