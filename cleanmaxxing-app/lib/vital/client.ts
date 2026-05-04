import 'server-only';

import { VitalClient, VitalEnvironment } from '@tryvital/vital-node';
import crypto from 'node:crypto';

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

// Verify a Vital webhook signature. Vital signs the raw request body
// with HMAC-SHA256 using your webhook secret and sends the hex digest
// in the `svix-signature` header (or, on legacy webhook versions,
// `x-vital-signature`). Returns true on a valid signature, false on
// any mismatch or missing secret. Uses timing-safe comparison.
export function verifyVitalWebhook(
  rawBody: string,
  signatureHeader: string | null,
): boolean {
  const secret = process.env.VITAL_WEBHOOK_SECRET;
  if (!secret || !signatureHeader) return false;
  const expected = crypto
    .createHmac('sha256', secret)
    .update(rawBody, 'utf8')
    .digest('hex');
  // signatureHeader may include a prefix like "v1," — strip anything
  // before a comma if present, then compare.
  const provided = signatureHeader.includes(',')
    ? signatureHeader.split(',').pop()!.trim()
    : signatureHeader.trim();
  if (provided.length !== expected.length) return false;
  try {
    return crypto.timingSafeEqual(
      Buffer.from(provided, 'hex'),
      Buffer.from(expected, 'hex'),
    );
  } catch {
    return false;
  }
}
