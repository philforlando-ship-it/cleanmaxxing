import 'server-only';

import { VitalClient, VitalEnvironment } from '@tryvital/vital-node';
import { Webhook } from 'svix';

// Centralized Vital server-SDK factory. Reads env vars lazily so a
// missing key doesn't crash module load — the routes that depend
// on the client check `getVitalClient()` for null and return a
// 503 with a clear message instead.

export function getVitalClient(): VitalClient | null {
  const apiKey = process.env.VITAL_API_KEY;
  const environment = process.env.VITAL_ENVIRONMENT;
  if (!apiKey || !environment) return null;
  return new VitalClient({
    apiKey,
    environment:
      environment === 'production'
        ? VitalEnvironment.Production
        : VitalEnvironment.Sandbox,
  });
}

// We accept any wearable Junction supports. health_integrations.provider
// and *_source columns store the raw Junction provider key directly
// after migration 0032 drops the enum check constraints. The helper
// below just normalizes whitespace / case; it deliberately does not
// allow-list providers because Junction adds them regularly.
export function vitalProviderToInternal(
  vitalProvider: string | null | undefined,
): { provider: string; source: string } | null {
  if (!vitalProvider) return null;
  const key = vitalProvider.trim().toLowerCase();
  if (!key) return null;
  return { provider: key, source: key };
}

// Friendly display labels for the most common Junction provider keys.
// Anything not in the map falls back to a title-cased version of the
// raw key so unknown providers still render reasonably.
const PROVIDER_LABELS: Record<string, string> = {
  apple_health_kit: 'Apple Health',
  apple_health: 'Apple Health',
  google_fit: 'Google Fit',
  health_connect: 'Health Connect',
  fitbit: 'Fitbit',
  oura: 'Oura',
  whoop: 'Whoop',
  whoop_v2: 'Whoop',
  garmin: 'Garmin',
  strava: 'Strava',
  withings: 'Withings',
  polar: 'Polar',
  dexcom: 'Dexcom',
  freestyle_libre: 'Freestyle Libre',
  wahoo: 'Wahoo',
  ultrahuman: 'Ultrahuman',
  omron: 'Omron',
  cronometer: 'Cronometer',
  mapmyfitness: 'MapMyFitness',
  myfitnesspal: 'MyFitnessPal',
  runkeeper: 'Runkeeper',
};

export function friendlyProviderName(provider: string | null | undefined): string {
  if (!provider) return 'your wearable';
  const key = provider.trim().toLowerCase();
  if (PROVIDER_LABELS[key]) return PROVIDER_LABELS[key];
  // Title-case fallback: 'some_new_provider' → 'Some New Provider'
  return key
    .split(/[_\s]+/)
    .map((w) => (w.length > 0 ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ');
}

// Verify a Junction (Vital) webhook. Junction uses Svix to deliver
// webhooks, so the signing scheme is HMAC-SHA256 over
// `${svix-id}.${svix-timestamp}.${rawBody}` with a base64-encoded
// signature in the `svix-signature` header. The Svix SDK handles
// header parsing, prefix stripping, and timing-safe comparison;
// we just pass the raw body and the relevant headers through.
//
// VITAL_WEBHOOK_SECRET should be the full secret as Junction
// displays it, including the `whsec_` prefix — Svix strips and
// decodes it internally.
//
// Returns true on a valid signature, false on any mismatch, missing
// header, or missing secret.
export function verifyVitalWebhook(
  rawBody: string,
  headers: {
    svixId: string | null;
    svixTimestamp: string | null;
    svixSignature: string | null;
  },
): boolean {
  const secret = process.env.VITAL_WEBHOOK_SECRET;
  if (!secret) return false;
  const { svixId, svixTimestamp, svixSignature } = headers;
  if (!svixId || !svixTimestamp || !svixSignature) return false;
  try {
    const wh = new Webhook(secret);
    wh.verify(rawBody, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    });
    return true;
  } catch {
    return false;
  }
}
