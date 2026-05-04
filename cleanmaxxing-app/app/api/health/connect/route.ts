import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { getVitalClient } from '@/lib/vital/client';

// Initiates a wearable connection via Junction (formerly Vital).
//
// Flow:
//   1. Find or create the Junction user that mirrors this user.
//   2. Generate a Junction link token + web URL with no provider
//      preselection — the widget renders its provider picker so
//      the user can pick whichever wearable they have (Whoop /
//      Oura / Fitbit / Garmin / etc.).
//   3. Return the linkWebUrl to the client; client redirects there.
//   4. User authorizes on Junction's hosted flow, lands back at
//      /settings?vital=connected.
//   5. Junction fires webhooks → /api/health/webhook upserts the
//      provider.connected event into health_integrations and the
//      sleep / activity events into the existing tables.
//
// Apple Health specifically requires a native iOS bridge that we
// don't ship today, so it is intentionally not in the picker the
// user sees — Junction handles that exclusion on its side.

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  }

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

  // One Junction user per Cleanmaxxing user, regardless of how many
  // wearables they end up connecting. Reuse the existing vital_user_id
  // from any prior integration row; otherwise create one.
  const { data: existing } = await service
    .from('health_integrations')
    .select('vital_user_id')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle();

  let vitalUserId: string;
  if (existing?.vital_user_id) {
    vitalUserId = existing.vital_user_id as string;
  } else {
    // Try to create. If a previous connect attempt already registered
    // this user on Junction's side but the user never finished the link
    // flow (so no provider.connected webhook fired and no
    // health_integrations row exists yet), Junction returns 400 with
    // INVALID_REQUEST: "Client user id already exists." In that case
    // we recover by looking up the existing Junction user via
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
