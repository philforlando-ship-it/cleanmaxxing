import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { verifyVitalWebhook, vitalProviderToInternal } from '@/lib/vital/client';

// Vital webhook receiver. Verifies the HMAC signature, then routes
// the event by type:
//
//   daily.data.sleep.created/updated     → upsert sleep_logs
//   daily.data.activity.created/updated  → upsert daily_activity
//   provider.connected / .disconnected   → updates health_integrations
//
// We deliberately ignore everything else for v1. New event types
// drop into the no-op tail without breaking ingestion.
//
// The route uses the service-role client because RLS policies on
// these tables only allow self-writes from the authed user; webhook
// events arrive without any user context.

type VitalSleepData = {
  source?: { provider?: string };
  user_id?: string;
  // Vital normalizes night_of as YYYY-MM-DD in the user's timezone.
  // Field names vary across SDK versions; we pull a few candidates.
  date?: string;
  bedtime_start?: string;
  bedtime_end?: string;
  duration?: number; // seconds
  efficiency?: number; // 0..1
  // Some providers expose a 1..100 score; we map to 1..5 for our
  // existing quality_1_5 column. Others only have efficiency.
  hr_average?: number;
};

type VitalActivityData = {
  source?: { provider?: string };
  user_id?: string;
  date?: string;
  steps?: number;
};

type VitalEvent = {
  event_type?: string;
  user_id?: string;
  data?: VitalSleepData | VitalActivityData;
  // Provider-connection events use a different shape:
  provider?: string;
  client_user_id?: string;
};

// Convert sleep efficiency (0..1) into a coarse 1..5 quality score
// matching the existing manual-entry scale. Conservative bands —
// efficiency rarely runs below 0.7 and rarely above 0.95 in real
// data. Returns null if efficiency is missing.
function efficiencyToQuality(eff: number | undefined): number | null {
  if (eff == null || !Number.isFinite(eff)) return null;
  if (eff < 0.7) return 1;
  if (eff < 0.8) return 2;
  if (eff < 0.85) return 3;
  if (eff < 0.92) return 4;
  return 5;
}

export async function POST(req: NextRequest) {
  // Read the body as raw text so we can verify HMAC against the
  // exact bytes Vital signed. JSON.parse comes after.
  const raw = await req.text();
  const sigHeader =
    req.headers.get('svix-signature') ??
    req.headers.get('x-vital-signature') ??
    null;

  if (!verifyVitalWebhook(raw, sigHeader)) {
    return NextResponse.json(
      { error: 'invalid_signature' },
      { status: 401 },
    );
  }

  let event: VitalEvent;
  try {
    event = JSON.parse(raw) as VitalEvent;
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const service = createServiceClient();

  const eventType = event.event_type ?? '';
  const vitalUserId = event.user_id ?? null;

  // Resolve our user_id from the Vital user_id via the integrations
  // table. Without a matching row we drop the event — the user has
  // already disconnected on our side and Vital just hasn't caught up.
  let cleanmaxxingUserId: string | null = null;
  if (vitalUserId) {
    const { data: row } = await service
      .from('health_integrations')
      .select('user_id, provider')
      .eq('vital_user_id', vitalUserId)
      .maybeSingle();
    cleanmaxxingUserId = (row?.user_id as string | null) ?? null;
  }

  // Provider-connection events. We upsert health_integrations from
  // the link callback flow. client_user_id is what we set in
  // user.create; that's our user.id.
  if (
    eventType === 'provider.connected' ||
    eventType === 'historical.provider.connected'
  ) {
    const clientUserId = event.client_user_id ?? null;
    const vitalProvider = event.provider ?? null;
    if (!clientUserId || !vitalUserId || !vitalProvider) {
      return NextResponse.json({ ok: true, ignored: 'incomplete_payload' });
    }
    const mapped = vitalProviderToInternal(vitalProvider);
    if (!mapped) {
      return NextResponse.json({ ok: true, ignored: 'unsupported_provider' });
    }
    await service.from('health_integrations').upsert(
      {
        user_id: clientUserId,
        provider: mapped.provider,
        vital_user_id: vitalUserId,
        connected_at: new Date().toISOString(),
        last_synced_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,provider' },
    );
    return NextResponse.json({ ok: true, type: 'provider.connected' });
  }

  if (eventType === 'provider.disconnected') {
    if (cleanmaxxingUserId) {
      await service
        .from('health_integrations')
        .delete()
        .eq('user_id', cleanmaxxingUserId)
        .eq('vital_user_id', vitalUserId);
    }
    return NextResponse.json({ ok: true, type: 'provider.disconnected' });
  }

  // Data ingestion events — sleep and activity for v1.
  if (!cleanmaxxingUserId) {
    return NextResponse.json({ ok: true, ignored: 'no_user_match' });
  }

  // Match both daily live updates and historical backfill events.
  // Vital fires `historical.data.<type>.created` on first connect
  // (typically 90 days of history) and on full re-syncs; ignoring
  // those would drop all backfill silently.
  if (
    eventType.startsWith('daily.data.sleep') ||
    eventType.startsWith('historical.data.sleep')
  ) {
    const data = (event.data ?? {}) as VitalSleepData;
    const provider = data.source?.provider ?? null;
    const mapped = provider ? vitalProviderToInternal(provider) : null;
    const source = mapped?.source ?? 'vital_apple_health';
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

  if (
    eventType.startsWith('daily.data.activity') ||
    eventType.startsWith('historical.data.activity')
  ) {
    const data = (event.data ?? {}) as VitalActivityData;
    const provider = data.source?.provider ?? null;
    const mapped = provider ? vitalProviderToInternal(provider) : null;
    const source = mapped?.source ?? 'vital_apple_health';
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

  // Anything else — accept and ignore. Better to swallow than to
  // 500 and trigger Vital retries in a tight loop.
  return NextResponse.json({ ok: true, ignored: eventType || 'unknown' });
}
