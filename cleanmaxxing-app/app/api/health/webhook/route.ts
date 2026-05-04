import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { verifyVitalWebhook, vitalProviderToInternal } from '@/lib/vital/client';

// Junction (Vital) webhook receiver. Verifies the Svix signature,
// then routes the event by type:
//
//   provider.connection.created    → upsert health_integrations
//   provider.connection.deleted    → delete health_integrations
//   *.data.sleep.created/updated   → upsert sleep_logs
//   *.data.activity.created/updated → upsert daily_activity
//
// Both `daily.data.*` (live updates) and `historical.data.*`
// (backfill on first connect) are matched. Anything else is
// accepted with a 200 + `ignored:` body so Junction's retry
// machine doesn't loop.
//
// The payload shape varies across Junction versions: some events
// carry their fields top-level, others nest them in `data`. We
// pull from both candidate locations on every read.

type SleepData = {
  source?: { provider?: string };
  user_id?: string;
  date?: string;
  bedtime_start?: string;
  bedtime_end?: string;
  duration?: number; // seconds
  efficiency?: number; // 0..1
};

type ActivityData = {
  source?: { provider?: string };
  user_id?: string;
  date?: string;
  steps?: number;
};

type ConnectionData = {
  client_user_id?: string;
  user_id?: string;
  provider?: string;
};

type RawEvent = {
  // Some Junction versions use `type`, others `event_type`.
  type?: string;
  event_type?: string;
  // Some put identifiers at the top level, others nest them under `data`.
  user_id?: string;
  client_user_id?: string;
  provider?: string;
  data?: SleepData | ActivityData | ConnectionData | Record<string, unknown>;
};

function efficiencyToQuality(eff: number | undefined): number | null {
  if (eff == null || !Number.isFinite(eff)) return null;
  if (eff < 0.7) return 1;
  if (eff < 0.8) return 2;
  if (eff < 0.85) return 3;
  if (eff < 0.92) return 4;
  return 5;
}

// Pull a string field from either the top-level object or its nested
// `data` payload. Junction varies; this hides the variance.
function pickStr(event: RawEvent, key: keyof ConnectionData): string | null {
  const top = (event as Record<string, unknown>)[key];
  if (typeof top === 'string' && top.length > 0) return top;
  const nested = (event.data as Record<string, unknown> | undefined)?.[key];
  if (typeof nested === 'string' && nested.length > 0) return nested;
  return null;
}

const CONNECTED_EVENTS = new Set([
  'provider.connection.created',
  'historical.provider.connection.created',
  // Older naming kept as fallbacks in case Junction has multiple
  // versions in flight on the same project.
  'provider.connected',
  'historical.provider.connected',
]);

const DISCONNECTED_EVENTS = new Set([
  'provider.connection.deleted',
  'provider.disconnected',
]);

function isSleepEvent(t: string): boolean {
  return (
    t.startsWith('daily.data.sleep') || t.startsWith('historical.data.sleep')
  );
}

function isActivityEvent(t: string): boolean {
  return (
    t.startsWith('daily.data.activity') ||
    t.startsWith('historical.data.activity')
  );
}

export async function POST(req: NextRequest) {
  // Read the body as raw text so signature verification operates on
  // the exact bytes Junction signed. JSON.parse comes after.
  const raw = await req.text();

  if (
    !verifyVitalWebhook(raw, {
      svixId: req.headers.get('svix-id'),
      svixTimestamp: req.headers.get('svix-timestamp'),
      svixSignature: req.headers.get('svix-signature'),
    })
  ) {
    return NextResponse.json(
      { error: 'invalid_signature' },
      { status: 401 },
    );
  }

  let event: RawEvent;
  try {
    event = JSON.parse(raw) as RawEvent;
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const eventType = event.type ?? event.event_type ?? '';
  const vitalUserId = pickStr(event, 'user_id');

  const service = createServiceClient();

  // Resolve our user_id from the Junction user_id. For connection
  // events we also have client_user_id directly, which is more
  // reliable; for data events the integration row is the only path.
  let cleanmaxxingUserId: string | null = null;
  if (vitalUserId) {
    const { data: row } = await service
      .from('health_integrations')
      .select('user_id, provider')
      .eq('vital_user_id', vitalUserId)
      .maybeSingle();
    cleanmaxxingUserId = (row?.user_id as string | null) ?? null;
  }

  // ---- Provider connection events ----
  if (CONNECTED_EVENTS.has(eventType)) {
    const clientUserId = pickStr(event, 'client_user_id');
    const vitalProvider = pickStr(event, 'provider');
    if (!clientUserId || !vitalUserId || !vitalProvider) {
      console.warn('[health/webhook] provider.connection.created with incomplete payload', {
        eventType,
        hasClientUserId: Boolean(clientUserId),
        hasVitalUserId: Boolean(vitalUserId),
        hasProvider: Boolean(vitalProvider),
      });
      return NextResponse.json({ ok: true, ignored: 'incomplete_payload' });
    }
    const mapped = vitalProviderToInternal(vitalProvider);
    if (!mapped) {
      return NextResponse.json({ ok: true, ignored: 'unsupported_provider' });
    }
    const { error } = await service.from('health_integrations').upsert(
      {
        user_id: clientUserId,
        provider: mapped.provider,
        vital_user_id: vitalUserId,
        connected_at: new Date().toISOString(),
        last_synced_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,provider' },
    );
    if (error) {
      console.error('[health/webhook] failed to upsert health_integrations', error);
      return NextResponse.json(
        { error: 'persist_failed', message: error.message },
        { status: 500 },
      );
    }
    return NextResponse.json({ ok: true, type: 'provider_connected' });
  }

  // ---- Provider disconnection events ----
  if (DISCONNECTED_EVENTS.has(eventType)) {
    if (cleanmaxxingUserId && vitalUserId) {
      await service
        .from('health_integrations')
        .delete()
        .eq('user_id', cleanmaxxingUserId)
        .eq('vital_user_id', vitalUserId);
    }
    return NextResponse.json({ ok: true, type: 'provider_disconnected' });
  }

  // ---- Data ingestion events ----
  if (!cleanmaxxingUserId) {
    return NextResponse.json({ ok: true, ignored: 'no_user_match' });
  }

  if (isSleepEvent(eventType)) {
    const data = (event.data ?? {}) as SleepData;
    const provider = data.source?.provider ?? null;
    const mapped = provider ? vitalProviderToInternal(provider) : null;
    const source = mapped?.source ?? 'unknown';
    const nightOf = data.date ?? null;
    const durationSec =
      data.duration ??
      (data.bedtime_start && data.bedtime_end
        ? Math.max(
            0,
            (new Date(data.bedtime_end).getTime() -
              new Date(data.bedtime_start).getTime()) /
              1000,
          )
        : null);
    if (!nightOf || durationSec == null) {
      return NextResponse.json({ ok: true, ignored: 'incomplete_sleep' });
    }
    const hours = Math.round((durationSec / 3600) * 10) / 10;
    const quality = efficiencyToQuality(data.efficiency);

    await service.from('sleep_logs').upsert(
      {
        user_id: cleanmaxxingUserId,
        night_of: nightOf,
        hours,
        quality_1_5: quality,
        source,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,night_of' },
    );

    await service
      .from('health_integrations')
      .update({ last_synced_at: new Date().toISOString() })
      .eq('user_id', cleanmaxxingUserId)
      .eq('vital_user_id', vitalUserId);

    return NextResponse.json({ ok: true, type: 'sleep_upserted' });
  }

  if (isActivityEvent(eventType)) {
    const data = (event.data ?? {}) as ActivityData;
    const provider = data.source?.provider ?? null;
    const mapped = provider ? vitalProviderToInternal(provider) : null;
    const source = mapped?.source ?? 'unknown';
    const date = data.date ?? null;
    const steps = data.steps ?? null;
    if (!date || steps == null) {
      return NextResponse.json({ ok: true, ignored: 'incomplete_activity' });
    }

    await service.from('daily_activity').upsert(
      {
        user_id: cleanmaxxingUserId,
        date,
        steps,
        source,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,date' },
    );

    await service
      .from('health_integrations')
      .update({ last_synced_at: new Date().toISOString() })
      .eq('user_id', cleanmaxxingUserId)
      .eq('vital_user_id', vitalUserId);

    return NextResponse.json({ ok: true, type: 'activity_upserted' });
  }

  return NextResponse.json({ ok: true, ignored: eventType || 'unknown' });
}
