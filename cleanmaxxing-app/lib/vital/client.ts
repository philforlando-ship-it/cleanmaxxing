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

// Provider value Vital expects for Apple HealthKit. Stored separately
// from our internal `health_integrations.provider` column ('apple_health')
// because the two namespaces drift independently.
export const VITAL_PROVIDER_APPLE_HEALTH = 'apple_health_kit';

// Map Vital provider keys (received in webhooks) back to our
// internal provider/source column values.
export function vitalProviderToInternal(
  vitalProvider: string,
): { provider: string; source: string } | null {
  if (vitalProvider === 'apple_health_kit') {
    return { provider: 'apple_health', source: 'vital_apple_health' };
  }
  if (vitalProvider === 'google_fit') {
    return { provider: 'google_fit', source: 'vital_google_fit' };
  }
  if (vitalProvider === 'health_connect') {
    return { provider: 'health_connect', source: 'vital_health_connect' };
  }
  return null;
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
