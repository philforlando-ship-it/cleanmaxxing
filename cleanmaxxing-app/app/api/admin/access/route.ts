// POST /api/admin/access — admin grants or revokes Pro access for a
// target user (email or UUID). Sets subscription_status='active' or
// 'canceled' and writes audit fields (granted_by_email,
// granted_at, grant_reason, revoked_*) so comped users are
// distinguishable from paying subscribers.
//
// Auth: ADMIN_EMAILS env allowlist (same gate as /admin/cost). The
// granted_by_email is read from the caller's auth session — not the
// form — so an admin can't impersonate another admin in the audit
// trail.

import { NextResponse } from 'next/server';
import { getUser } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/admin/is-admin';
import {
  grantPro,
  resolveTargetUserId,
  revokePro,
} from '@/lib/admin/grant-pro';

type Body = {
  action?: 'grant' | 'revoke';
  target?: string;
  reason?: string;
};

export async function POST(req: Request) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  }
  if (!isAdmin(user.email)) {
    return NextResponse.json({ error: 'not_admin' }, { status: 404 });
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json(
      { error: 'Body must be JSON.' },
      { status: 400 },
    );
  }

  const action = body.action;
  const target = body.target?.trim();
  if (!target || (action !== 'grant' && action !== 'revoke')) {
    return NextResponse.json(
      { error: 'action must be "grant" or "revoke" and target is required.' },
      { status: 400 },
    );
  }

  const targetUserId = await resolveTargetUserId(target);
  if (!targetUserId) {
    return NextResponse.json(
      { error: `No auth user found for "${target}".` },
      { status: 404 },
    );
  }

  const adminEmail = user.email ?? 'unknown';
  const result =
    action === 'grant'
      ? await grantPro(targetUserId, adminEmail, body.reason ?? null)
      : await revokePro(targetUserId, adminEmail);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    userId: result.userId,
    previousStatus: result.previousStatus,
  });
}
