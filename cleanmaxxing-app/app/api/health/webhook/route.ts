import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import {
  verifyVitalWebhook,
  vitalProviderToInternal,
  getVitalClient,
} from '@/lib/vital/client';

// Junction (Vital) webhook receiver.
//
// IMPORTANT: Junction's data webhooks are notifications, not data.
// `daily.data.activity.created` carries `{user_id, start_date,
// end_date, is_final, provider}` — telling us "fresh data is
// available for this user/provider in this date range". To get
// the actual rows we follow up with `vital.activity.get` /
// `vital.sleep.get`. Connection events (provider.connection.*)
// carry their data inline.
//
// Provider connection events:
//   provider.connection.created — body fields snake_case at top
//     level (event_type, user_id, client_user_id, team_id, data);
//     data.provider is a ClientFacingProvider object with
//     {name, slug, logo}.
//   provider.connection.deleted — same shape, removes our row.
//
// Data notifications (sleep, activity):
//   daily.data.<type>.created/updated — live updates
//   historical.data.<type>.created — first-connect backfill
//   data.start_date / data.end_date define the range to fetch.
//   data.provider is a string slug here (not the object form).
//
// SDK API responses come back camelCase via Fern serialization
// (ClientFacingActivity.calendarDate / .caloriesActive / .low /
// .medium / .high / .source.provider; ClientFacingSleep similar).

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

// Data webhooks from Junction are notifications: they tell us
// "fresh data exists for this user/provider in this date range",
// not the data itself.
type DataNotification = {
  user_id?: string;
  start_date?: string;
  end_date?: string;
  is_final?: boolean;
  provider?: string;
};

type WebhookEvent = {
  event_type?: string;
  // Some legacy versions used eventType; tolerate both.
  eventType?: string;
  user_id?: string;
  client_user_id?: string;
  team_id?: string;
  data?: ConnectionData | DataNotification;
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

// Some wearables emit a separate `steps` event family with a
// time-series payload (intervals + counts) instead of the rolled-up
// activity summary. We aggregate the intervals into daily totals and
// upsert just the steps column, preserving any active_calories /
// intensity values written by an activity event.
function isStepsEvent(t: string): boolean {
  return (
    t.startsWith('daily.data.steps') || t.startsWith('historical.data.steps')
  );
}

// VO2max comes through its own event family with a timeseries payload
// (Vital wraps even slow-cadence metrics as intervals). For each row
// we take the value mapped to the user's local-day; if multiple rows
// land on the same day, last write wins.
function isVo2MaxEvent(t: string): boolean {
  return (
    t.startsWith('daily.data.vo2_max') ||
    t.startsWith('historical.data.vo2_max')
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

  const eventType = event.event_type ?? event.eventType ?? '';
  const vitalUserId = event.user_id ?? null;

  const bodyKeys = Object.keys(event);
  const dataKeys = event.data ? Object.keys(event.data as object) : [];

  // Diagnostic logging to stdout (Vercel runtime logs). The original
  // version of this block also persisted to a `webhook_debug` table
  // for easier post-hoc inspection via Supabase, but that table was
  // dropped in 0083_security_lockdown.sql when the missing-RLS gap
  // was closed. Calls to logBranch() are kept (23 sites) and now
  // write to stdout only.
  console.log('[health/webhook] received', {
    eventType,
    hasVitalUserId: Boolean(vitalUserId),
    bodyKeys,
    dataKeys,
  });

  function logBranch(branchTaken: string) {
    console.log('[health/webhook] branch', {
      eventType,
      branchTaken,
      bodyKeys,
      dataKeys,
    });
  }

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
    const clientUserId = event.client_user_id ?? null;
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
      await logBranch('connection_incomplete');
      return NextResponse.json({ ok: true, ignored: 'incomplete_payload' });
    }
    const mapped = vitalProviderToInternal(providerSlug);
    if (!mapped) {
      await logBranch('unsupported_provider');
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
      await logBranch('connection_persist_failed');
      return NextResponse.json(
        { error: 'persist_failed', message: error.message },
        { status: 500 },
      );
    }
    await logBranch('provider_connected');
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
    await logBranch('provider_disconnected');
    return NextResponse.json({ ok: true, type: 'provider_disconnected' });
  }

  // ---- Data ingestion events ----
  if (!cleanmaxxingUserId) {
    await logBranch('no_user_match');
    return NextResponse.json({ ok: true, ignored: 'no_user_match' });
  }

  // Sleep, activity, steps, and VO2max events are notifications:
  // extract the date range, fetch via the SDK, iterate the response,
  // upsert each row.
  const isSleep = isSleepEvent(eventType);
  const isActivity = isActivityEvent(eventType);
  const isSteps = isStepsEvent(eventType);
  const isVo2Max = isVo2MaxEvent(eventType);
  if (isSleep || isActivity || isSteps || isVo2Max) {
    const notif = (event.data ?? {}) as DataNotification;
    const startDate = notif.start_date;
    const endDate = notif.end_date;
    const providerSlug = notif.provider ?? null;
    const branchPrefix = isSleep
      ? 'sleep'
      : isActivity
        ? 'activity'
        : isSteps
          ? 'steps'
          : 'vo2_max';

    if (!startDate || !endDate || !vitalUserId) {
      await logBranch(`${branchPrefix}_incomplete_notification`);
      return NextResponse.json({
        ok: true,
        ignored: `incomplete_${branchPrefix}_notification`,
      });
    }

    const vital = getVitalClient();
    if (!vital) {
      await logBranch(`${branchPrefix}_vital_not_configured`);
      return NextResponse.json({ ok: true, ignored: 'vital_not_configured' });
    }

    if (isSleep) {
      let response;
      try {
        response = await vital.sleep.get(vitalUserId, {
          startDate,
          endDate,
          provider: providerSlug ?? undefined,
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'unknown';
        console.error('[health/webhook] sleep.get failed', msg);
        await logBranch('sleep_fetch_failed');
        return NextResponse.json(
          { error: 'sleep_fetch_failed', message: msg },
          { status: 502 },
        );
      }

      let upserted = 0;
      for (const row of response.sleep ?? []) {
        const nightOf = row.calendarDate;
        const durationSec = row.duration;
        if (!nightOf || durationSec == null) continue;
        const hours = Math.round((durationSec / 3600) * 10) / 10;
        const quality = scoreToQuality(row.score);
        const sourceSlug = row.source?.provider ?? providerSlug ?? 'unknown';
        const mapped = vitalProviderToInternal(sourceSlug);
        const source = mapped?.source ?? sourceSlug;

        // Resting HR + HRV are delivered inline on the sleep payload
        // (ClientFacingSleep.hrResting / .averageHrv — rmssd in ms).
        // Providers that don't report them leave the fields undefined;
        // we store NULL in that case.
        const restingHeartRate =
          row.hrResting != null && Number.isFinite(row.hrResting)
            ? Math.round(row.hrResting)
            : null;
        const hrvRmssd =
          row.averageHrv != null && Number.isFinite(row.averageHrv)
            ? Math.round(row.averageHrv)
            : null;

        const { error } = await service.from('sleep_logs').upsert(
          {
            user_id: cleanmaxxingUserId,
            night_of: nightOf,
            hours,
            quality_1_5: quality,
            resting_heart_rate: restingHeartRate,
            hrv_rmssd: hrvRmssd,
            source,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,night_of' },
        );
        if (error) {
          console.error('[health/webhook] sleep upsert failed', error);
          await logBranch('sleep_persist_failed');
          return NextResponse.json(
            { error: 'persist_failed', message: error.message },
            { status: 500 },
          );
        }
        upserted++;
      }

      await service
        .from('health_integrations')
        .update({ last_synced_at: new Date().toISOString() })
        .eq('user_id', cleanmaxxingUserId)
        .eq('vital_user_id', vitalUserId);

      await logBranch(`sleep_upserted_${upserted}`);
      return NextResponse.json({
        ok: true,
        type: 'sleep_upserted',
        count: upserted,
      });
    }

    // Steps branch — time-series intervals aggregated to per-day
    // totals using the user's stored IANA timezone. Bucketing by
    // raw timezoneOffset arithmetic was off by a day in earlier
    // testing; Intl.DateTimeFormat with the IANA tz is robust to
    // DST + offset edge cases.
    if (isSteps) {
      let response;
      try {
        response = await vital.vitals.steps(vitalUserId, {
          startDate,
          endDate,
          provider: providerSlug ?? undefined,
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'unknown';
        console.error('[health/webhook] vitals.steps failed', msg);
        await logBranch('steps_fetch_failed');
        return NextResponse.json(
          { error: 'steps_fetch_failed', message: msg },
          { status: 502 },
        );
      }

      // Look up the user's IANA timezone for local-day bucketing.
      // Default to America/New_York if unset — same default used
      // throughout the app.
      const { data: userRow } = await service
        .from('users')
        .select('timezone')
        .eq('id', cleanmaxxingUserId)
        .maybeSingle();
      const userTz =
        (userRow?.timezone as string | null) ?? 'America/New_York';

      const ymdFmt = new Intl.DateTimeFormat('en-CA', {
        timeZone: userTz,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });

      const stepsByDay = new Map<string, number>();
      let exampleRow: {
        start?: string;
        timezoneOffset?: number;
        value?: number;
        bucketedTo?: string;
      } | null = null;
      for (const row of response ?? []) {
        const value = row.value ?? 0;
        if (!value || !row.start) continue;
        const day = ymdFmt.format(new Date(row.start)); // en-CA gives YYYY-MM-DD
        stepsByDay.set(day, (stepsByDay.get(day) ?? 0) + value);
        if (!exampleRow) {
          exampleRow = {
            start:
              row.start instanceof Date
                ? row.start.toISOString()
                : String(row.start),
            timezoneOffset: row.timezoneOffset,
            value,
            bucketedTo: day,
          };
        }
      }

      // Diagnostic — log one example interval so we can verify the
      // start time + offset + bucketed day make sense if the user
      // reports another mismatch.
      if (exampleRow) {
        console.log('[health/webhook] steps example', {
          userTz,
          ...exampleRow,
        });
      }

      const sourceSlug = providerSlug ?? 'unknown';
      const mapped = vitalProviderToInternal(sourceSlug);
      const source = mapped?.source ?? sourceSlug;

      let upserted = 0;
      for (const [date, steps] of stepsByDay) {
        const { error } = await service.from('daily_activity').upsert(
          {
            user_id: cleanmaxxingUserId,
            date,
            steps: Math.round(steps),
            source,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,date' },
        );
        if (error) {
          console.error('[health/webhook] steps upsert failed', error);
          await logBranch('steps_persist_failed');
          return NextResponse.json(
            { error: 'persist_failed', message: error.message },
            { status: 500 },
          );
        }
        upserted++;
      }

      await service
        .from('health_integrations')
        .update({ last_synced_at: new Date().toISOString() })
        .eq('user_id', cleanmaxxingUserId)
        .eq('vital_user_id', vitalUserId);

      await logBranch(`steps_upserted_${upserted}_tz_${userTz}`);
      return NextResponse.json({
        ok: true,
        type: 'steps_upserted',
        count: upserted,
        timezone: userTz,
      });
    }

    // VO2max branch — slow-cadence aerobic capacity estimate. Vital
    // returns a timeseries shape even though most providers update
    // VO2max weekly or less often; we bucket by user-local day and
    // last-write-wins when multiple intervals land on the same date.
    if (isVo2Max) {
      let response;
      try {
        response = await vital.vitals.vo2Max(vitalUserId, {
          startDate,
          endDate,
          provider: providerSlug ?? undefined,
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'unknown';
        console.error('[health/webhook] vitals.vo2Max failed', msg);
        await logBranch('vo2_max_fetch_failed');
        return NextResponse.json(
          { error: 'vo2_max_fetch_failed', message: msg },
          { status: 502 },
        );
      }

      const { data: userRow } = await service
        .from('users')
        .select('timezone')
        .eq('id', cleanmaxxingUserId)
        .maybeSingle();
      const userTz =
        (userRow?.timezone as string | null) ?? 'America/New_York';

      const ymdFmt = new Intl.DateTimeFormat('en-CA', {
        timeZone: userTz,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });

      // Last write wins per day. Provider order is chronological per
      // Vital's timeseries convention, so iterating and overwriting
      // gives us the most recent value per local-day.
      const valueByDay = new Map<string, number>();
      for (const row of response ?? []) {
        if (!row.start || row.value == null || !Number.isFinite(row.value)) {
          continue;
        }
        const day = ymdFmt.format(new Date(row.start));
        valueByDay.set(day, row.value);
      }

      const sourceSlug = providerSlug ?? 'unknown';
      const mapped = vitalProviderToInternal(sourceSlug);
      const source = mapped?.source ?? sourceSlug;

      let upserted = 0;
      for (const [date, value] of valueByDay) {
        const rounded = Math.round(value * 10) / 10;
        const { error } = await service.from('daily_activity').upsert(
          {
            user_id: cleanmaxxingUserId,
            date,
            vo2_max: rounded,
            source,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,date' },
        );
        if (error) {
          console.error('[health/webhook] vo2_max upsert failed', error);
          await logBranch('vo2_max_persist_failed');
          return NextResponse.json(
            { error: 'persist_failed', message: error.message },
            { status: 500 },
          );
        }
        upserted++;
      }

      await service
        .from('health_integrations')
        .update({ last_synced_at: new Date().toISOString() })
        .eq('user_id', cleanmaxxingUserId)
        .eq('vital_user_id', vitalUserId);

      await logBranch(`vo2_max_upserted_${upserted}`);
      return NextResponse.json({
        ok: true,
        type: 'vo2_max_upserted',
        count: upserted,
      });
    }

    // Activity branch.
    let response;
    try {
      response = await vital.activity.get(vitalUserId, {
        startDate,
        endDate,
        provider: providerSlug ?? undefined,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'unknown';
      console.error('[health/webhook] activity.get failed', msg);
      await logBranch('activity_fetch_failed');
      return NextResponse.json(
        { error: 'activity_fetch_failed', message: msg },
        { status: 502 },
      );
    }

    let upserted = 0;
    for (const row of response.activity ?? []) {
      const date = row.calendarDate;
      const steps = row.steps ?? null;
      if (!date || steps == null) continue;

      // Junction sends some intensity fields as floats for sub-minute
      // precision; round to int so the columns accept them.
      const activeCalories =
        row.caloriesActive != null && Number.isFinite(row.caloriesActive)
          ? Math.round(row.caloriesActive)
          : null;
      const lowMinutes =
        row.low != null && Number.isFinite(row.low)
          ? Math.round(row.low)
          : null;
      const mediumMinutes =
        row.medium != null && Number.isFinite(row.medium)
          ? Math.round(row.medium)
          : null;
      const highMinutes =
        row.high != null && Number.isFinite(row.high)
          ? Math.round(row.high)
          : null;

      const sourceSlug = row.source?.provider ?? providerSlug ?? 'unknown';
      const mapped = vitalProviderToInternal(sourceSlug);
      const source = mapped?.source ?? sourceSlug;

      const { error } = await service.from('daily_activity').upsert(
        {
          user_id: cleanmaxxingUserId,
          date,
          steps,
          active_calories: activeCalories,
          low_minutes: lowMinutes,
          medium_minutes: mediumMinutes,
          high_minutes: highMinutes,
          source,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,date' },
      );
      if (error) {
        console.error('[health/webhook] activity upsert failed', error);
        await logBranch('activity_persist_failed');
        return NextResponse.json(
          { error: 'persist_failed', message: error.message },
          { status: 500 },
        );
      }
      upserted++;
    }

    await service
      .from('health_integrations')
      .update({ last_synced_at: new Date().toISOString() })
      .eq('user_id', cleanmaxxingUserId)
      .eq('vital_user_id', vitalUserId);

    await logBranch(`activity_upserted_${upserted}`);
    return NextResponse.json({
      ok: true,
      type: 'activity_upserted',
      count: upserted,
    });
  }

  console.log('[health/webhook] no branch matched', { eventType });
  await logBranch('no_branch_matched');
  return NextResponse.json({ ok: true, ignored: eventType || 'unknown' });
}
