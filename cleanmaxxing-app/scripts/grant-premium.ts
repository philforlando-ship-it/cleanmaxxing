// Grant or revoke premium access for a tester by email or user UUID.
//
// Flips public.users.subscription_status — bypasses Stripe entirely.
// Granting sets status='active' (premium regardless of trial window).
// Revoking sets status='canceled' (denies the requirePremium guard).
//
// Usage:
//   npm run grant-premium -- <email-or-uuid>
//   npm run grant-premium -- <email-or-uuid> --revoke

import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const args = process.argv.slice(2);
// Skip --flags and dotenv's positional config arg (dotenv_config_path=...).
const target = args.find(
  (a) => !a.startsWith('--') && !a.startsWith('dotenv_config_'),
);
const revoke = args.includes('--revoke');

if (!target) {
  console.error('Usage: npm run grant-premium -- <email-or-uuid> [--revoke]');
  process.exit(1);
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = UUID_RE.test(target);

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function resolveUserId(input: string): Promise<string | null> {
  if (isUuid) return input;

  // auth.admin.listUsers paginates; iterate until we find the email or
  // exhaust the list. Tester volume is low so this is fine.
  const PAGE = 200;
  for (let page = 1; page < 50; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: PAGE,
    });
    if (error) {
      console.error('listUsers failed:', error.message);
      return null;
    }
    const match = data.users.find(
      (u) => u.email?.toLowerCase() === input.toLowerCase(),
    );
    if (match) return match.id;
    if (data.users.length < PAGE) return null;
  }
  return null;
}

async function main() {
  // target is narrowed at module scope by the guard above; TS doesn't
  // carry the narrowing across the function boundary, so assert here.
  const userId = await resolveUserId(target!);
  if (!userId) {
    console.error(`No auth user found for "${target}"`);
    process.exit(1);
  }

  const newStatus = revoke ? 'canceled' : 'active';

  const { data: before } = await supabase
    .from('users')
    .select('subscription_status')
    .eq('id', userId)
    .maybeSingle();

  if (!before) {
    console.error(`No public.users row for ${userId} — was the user ever onboarded?`);
    process.exit(1);
  }

  const nowIso = new Date().toISOString();
  const auditPatch = revoke
    ? {
        pro_revoked_at: nowIso,
        pro_revoked_by_email: 'cli',
      }
    : {
        pro_granted_at: nowIso,
        pro_granted_by_email: 'cli',
        pro_grant_reason: null,
        pro_revoked_at: null,
        pro_revoked_by_email: null,
      };

  const { error: updateErr } = await supabase
    .from('users')
    .update({ subscription_status: newStatus, ...auditPatch })
    .eq('id', userId);

  if (updateErr) {
    console.error('Update failed:', updateErr.message);
    process.exit(1);
  }

  const action = revoke ? 'REVOKED' : 'GRANTED';
  console.log(
    `[${action}] user ${userId}: ${before.subscription_status} -> ${newStatus}`,
  );
}

main().catch((err) => {
  console.error('grant-premium crashed:', err);
  process.exit(2);
});
