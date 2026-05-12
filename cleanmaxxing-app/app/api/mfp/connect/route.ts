import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServiceClient } from '@/lib/supabase/server';
import { requirePremium } from '@/lib/billing/is-premium';
import { encryptPassword, isMfpConfigured } from '@/lib/mfp/credentials';

// Save MyFitnessPal credentials. Slice 1 — no actual scrape yet,
// just stores ciphertext so Slice 2's Python sync function has
// something to read.
//
// Pro-gated to match the wearable integration. Free users see the
// upgrade CTA in the settings card; this route returns 402.
//
// Idempotent: subsequent connects with the same user re-encrypt and
// upsert. Status flips back to 'active' (a user re-entering creds
// after an 'auth_failed' is the recovery path).

const BodySchema = z.object({
  mfp_username: z.string().trim().min(1).max(254),
  mfp_password: z.string().min(1).max(256),
});

export async function POST(req: NextRequest) {
  const auth = await requirePremium();
  if (!auth.ok) return auth.response;
  const userId = auth.userId;

  if (!isMfpConfigured()) {
    return NextResponse.json(
      {
        error: 'mfp_integration_disabled',
        message:
          'Server is missing MFP_ENCRYPTION_KEY. Set it in the environment to enable credential storage.',
      },
      { status: 503 },
    );
  }

  let parsed: z.infer<typeof BodySchema>;
  try {
    const json = await req.json();
    parsed = BodySchema.parse(json);
  } catch {
    return NextResponse.json(
      { error: 'invalid_body', message: 'Username and password required.' },
      { status: 400 },
    );
  }

  let ciphertext: string;
  try {
    ciphertext = encryptPassword(parsed.mfp_password);
  } catch (err) {
    return NextResponse.json(
      {
        error: 'encrypt_failed',
        message: err instanceof Error ? err.message : 'unknown',
      },
      { status: 500 },
    );
  }

  const service = createServiceClient();
  const { error } = await service.from('mfp_integrations').upsert(
    {
      user_id: userId,
      mfp_username: parsed.mfp_username,
      encrypted_password: ciphertext,
      status: 'active',
      last_error: null,
      last_error_at: null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  );

  if (error) {
    return NextResponse.json(
      { error: 'db_write_failed', message: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
