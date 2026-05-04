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
    // Try to create. If a previous connect attempt already registered
    // this user on Vital's side but the user never finished the link
    // flow (so no provider.connected webhook fired and no
    // health_integrations row exists yet), Vital returns 400 with
    // INVALID_REQUEST: "Client user id already exists." In that case
    // we recover by looking up the existing Vital user via
    // getByClientUserId rather than failing the second attempt.
    try {
      const created = await vital.user.create({ clientUserId: user.id });
      vitalUserId = created.userId;
    } catch (createErr) {
      const msg = createErr instanceof Error ? createErr.message : '';
      const isAlreadyExists =
        /already\s*exists/i.test(msg) || /INVALID_REQUEST/.test(msg);
      if (!isAlreadyExists) {
        return NextResponse.json(
          {
            error: 'vital_user_create_failed',
            message: msg || 'unknown',
          },
          { status: 502 },
        );
      }
      try {
        const looked = await vital.user.getByClientUserId(user.id);
        vitalUserId = looked.userId;
      } catch (lookupErr) {
        return NextResponse.json(
          {
            error: 'vital_user_lookup_failed',
            message:
              lookupErr instanceof Error ? lookupErr.message : 'unknown',
          },
          { status: 502 },
        );
      }
    }
  }

  const redirectBase =
    process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

  // No provider preselection and no filter for now. Pre-selecting
  // apple_health_kit on a desktop browser rendered blank because
  // Vital tried to launch an iOS-only flow with nowhere to go.
  // filterOnProviders=['apple_health_kit'] then rendered an empty
  // list — likely a key-mismatch post-rebrand to Junction. Letting
  // the widget render its full picker gets us unblocked while we
  // confirm the right filter key in the Junction dashboard. We can
  // re-add a filter once we know it works.
  let token;
  try {
    token = await vital.link.token({
      userId: vitalUserId,
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
