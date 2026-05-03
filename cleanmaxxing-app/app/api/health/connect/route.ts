import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { getVitalClient, VITAL_PROVIDER_APPLE_HEALTH } from '@/lib/vital/client';

// Initiates an Apple Health connection via Vital.
//
// Flow:
//   1. Find or create the Vital user that mirrors this Cleanmaxxing user.
//   2. Generate a Vital link token + web URL scoped to Apple Health.
//   3. Return the linkWebUrl to the client; client redirects there.
//   4. User authorizes on Vital's hosted flow, lands back on /settings.
//   5. Vital starts firing webhooks → /api/health/webhook upserts data.

const RequestSchema = z.object({
  // Provider opaque to the client for now — only Apple Health is
  // wired. Kept as a body field so adding Google Fit / Health
  // Connect later is just an enum addition, not a route fork.
  provider: z.enum(['apple_health']).optional().default('apple_health'),
});

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  }

  const parsed = RequestSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
  }
  const { provider } = parsed.data;

  const vital = getVitalClient();
  if (!vital) {
    return NextResponse.json(
      {
        error: 'health_integration_disabled',
        message:
          'Server is missing VITAL_API_KEY and/or VITAL_ENVIRONMENT. Connect once those are set in the environment.',
      },
      { status: 503 },
    );
  }

  const service = createServiceClient();

  // Find an existing Vital user id, or register a new one. We key
  // off (user_id, provider); a Cleanmaxxing user can have one row
  // per provider. The clientUserId we pass to Vital is our internal
  // auth user id — stable, unique, and not PII.
  const { data: existing } = await service
    .from('health_integrations')
    .select('vital_user_id')
    .eq('user_id', user.id)
    .eq('provider', provider)
    .maybeSingle();

  let vitalUserId: string;
  if (existing?.vital_user_id) {
    vitalUserId = existing.vital_user_id as string;
  } else {
    try {
      const created = await vital.user.create({ clientUserId: user.id });
      vitalUserId = created.userId;
    } catch (e) {
      return NextResponse.json(
        {
          error: 'vital_user_create_failed',
          message: e instanceof Error ? e.message : 'unknown',
        },
        { status: 502 },
      );
    }
  }

  const redirectBase =
    process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

  let token;
  try {
    token = await vital.link.token({
      userId: vitalUserId,
      provider: VITAL_PROVIDER_APPLE_HEALTH,
      redirectUrl: `${redirectBase}/settings?vital=connected`,
    });
  } catch (e) {
    return NextResponse.json(
      {
        error: 'vital_link_token_failed',
        message: e instanceof Error ? e.message : 'unknown',
      },
      { status: 502 },
    );
  }

  return NextResponse.json({
    linkWebUrl: token.linkWebUrl,
    linkToken: token.linkToken,
    vitalUserId,
  });
}
