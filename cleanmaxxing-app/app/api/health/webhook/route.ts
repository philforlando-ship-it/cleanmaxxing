import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { verifyVitalWebhook, vitalProviderToInternal } from '@/lib/vital/client';

// Junction (Vital) webhook receiver. Verifies the Svix signature,
// then routes the event by type. Field names follow Junction's
// SDK type definitions exactly (camelCase, with provider info
// living inside the data block):
//
//   provider.connection.created    → upsert health_integrations
//   provider.connection.deleted    → delete health_integrations
//   *.data.sleep.created/updated   → upsert sleep_logs
//   *.data.activity.created/updated → upsert daily_activity
//
// Both `daily.data.*` (live updates) and `historical.data.*`
// (backfill on first connect) are matched.
//
// Source of truth for shapes:
//   ClientFacingProviderConnectionCreatedEvent
//   ClientFacingActivityChanged + ClientFacingActivity
//   ClientFacingSleepChanged + ClientFacingSleep
//   ClientFacingProvider, ClientFacingSource
// (all in @tryvital/vital-node)

type ClientFacingProvider = {
  name: string;
  slug: string;
  logo?: string;
};

type ClientFacingSource = {
  provider: string; // slug
  type?: string;
  appId?: string;
  deviceId?: string;
};

type ConnectionData = {
  userId?: string;
  provider?: ClientFacingProvider;
  // Legacy field, still present in current payloads:
  source?: ClientFacingProvider;
};

type SleepPayload = {
  userId?: string;
  calendarDate?: string; // YYYY-MM-DD
  date?: string; // legacy ISO timestamp
  bedtimeStart?: string;
  bedtimeStop?: string;
  duration?: number; // seconds
  // 1..100 score, available on Withings/Oura/Whoop/Garmin. Preferred
  // over efficiency when present.
  score?: number;
  efficiency?: number;
  source?: ClientFacingSource;
};

type ActivityPayload = {
  userId?: string;
  calendarDate?: string;
  date?: string;
  steps?: number;
  source?: ClientFacingSource;
};

type WebhookEvent = {
  eventType?: string;
  // Legacy fallback name used by older webhook versions.
  event_type?: string;
  userId?: string;
  clientUserId?: string;
  teamId?: string;
  data?: ConnectionData | SleepPayload | ActivityPayload;
};

// Map a 1..100 sleep score (Withings/Oura/Whoop/Garmin) to our 1..5
// quality scale. Conservative bands.
function scoreToQuality(score: number | undefined): number | null {
  if (score == null || !Number.isFinite(score)) return null;
  if (score >= 90) return 5;
  if (score >= 80) return 4;
  if (score >= 70) return 3;
  if (score >= 60) return 2;
  return 1;
}

// Fallback: efficiency (0..1) when score isn't provided.
function efficiencyToQuality(eff: number | undefined): number | null {
  if (eff == null || !Number.isFinite(eff)) return null;
  if (eff < 0.7) return 1;
  if (eff < 0.8) return 2;
  if (eff < 0.85) return 3;
  if (eff < 0.92) return 4;
  return 5;
}

const CONNECTED_EVENTS = new Set([
  'provider.connection.created',
  'historical.provider.connection.created',
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

  let event: WebhookEvent;
  try {
    event = JSON.parse(raw) as WebhookEvent;
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const eventType = event.eventType ?? event.event_type ?? '';
  const vitalUserId = event.userId ?? null;

  const service = createServiceClient();

  // Resolve our user_id from the Junction user_id. Used by data
  // events; connection events use clientUserId directly.
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
    const clientUserId = event.clientUserId ?? null;
    const data = (event.data ?? {}) as ConnectionData;
    // Junction lifted `provider` into a nested object; the legacy
    // `source` field (deprecated post-2024-01) still appears in
    // some payloads, so we fall back to it for safety.
    const providerObj = data.provider ?? data.source ?? null;
    const providerSlug = providerObj?.slug ?? null;

    if (!clientUserId || !vitalUserId || !providerSlug) {
      console.warn('[health/webhook] connection event with incomplete payload', {
        eventType,
        hasClientUserId: Boolean(clientUserId),
        hasVitalUserId: Boolean(vitalUserId),
        hasProviderSlug: Boolean(providerSlug),
      });
      return NextResponse.json({ ok: true, ignored: 'incomplete_payload' });
    }
    const mapped = vitalProviderToInternal(providerSlug);
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
    const data = (event.data ?? {}) as SleepPayload;
    const sourceSlug = data.source?.provider ?? null;
    const mapped = sourceSlug ? vitalProviderToInternal(sourceSlug) : null;
    const source = mapped?.source ?? sourceSlug ?? 'unknown';
    const nightOf =
      data.calendarDate ??
      (data.date ? new Date(data.date).toISOString().slice(0, 10) : null);
    const durationSec =
      data.duration ??
      (data.bedtimeStart && data.bedtimeStop
        ? Math.max(
            0,
            (new Date(data.bedtimeStop).getTime() -
              new Date(data.bedtimeStart).getTime()) /
              1000,
          )
        : null);
    if (!nightOf || durationSec == null) {
      return NextResponse.json({ ok: true, ignored: 'incomplete_sleep' });
    }
    const hours = Math.round((durationSec / 3600) * 10) / 10;
    const quality =
      scoreToQuality(data.score) ?? efficiencyToQuality(data.efficiency);

    const { error } = await service.from('sleep_logs').upsert(
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
    if (error) {
      console.error('[health/webhook] failed to upsert sleep_logs', error);
      return NextResponse.json(
        { error: 'persist_failed', message: error.message },
        { status: 500 },
      );
    }

    await service
      .from('health_integrations')
      .update({ last_synced_at: new Date().toISOString() })
      .eq('user_id', cleanmaxxingUserId)
      .eq('vital_user_id', vitalUserId);

    return NextResponse.json({ ok: true, type: 'sleep_upserted' });
  }

  if (isActivityEvent(eventType)) {
    const data = (event.data ?? {}) as ActivityPayload;
    const sourceSlug = data.source?.provider ?? null;
    const mapped = sourceSlug ? vitalProviderToInternal(sourceSlug) : null;
    const source = mapped?.source ?? sourceSlug ?? 'unknown';
    const date =
      data.calendarDate ??
      (data.date ? new Date(data.date).toISOString().slice(0, 10) : null);
    const steps = data.steps ?? null;
    if (!date || steps == null) {
      return NextResponse.json({ ok: true, ignored: 'incomplete_activity' });
    }

    const { error } = await service.from('daily_activity').upsert(
      {
        user_id: cleanmaxxingUserId,
        date,
        steps,
        source,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,date' },
    );
    if (error) {
      console.error('[health/webhook] failed to upsert daily_activity', error);
      return NextResponse.json(
        { error: 'persist_failed', message: error.message },
        { status: 500 },
      );
    }

    await service
      .from('health_integrations')
      .update({ last_synced_at: new Date().toISOString() })
      .eq('user_id', cleanmaxxingUserId)
      .eq('vital_user_id', vitalUserId);

    return NextResponse.json({ ok: true, type: 'activity_upserted' });
  }

  return NextResponse.json({ ok: true, ignored: eventType || 'unknown' });
}
