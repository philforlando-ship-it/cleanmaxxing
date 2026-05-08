// Admin gate driven by ADMIN_EMAILS env var. Comma-separated list of
// email addresses; case-insensitive match. Used by the cost dashboard
// (and any future admin surfaces). Failing closed when env is unset
// or empty — no email returns false, including the user's own.
//
// Why env-var rather than a users.is_admin column:
//   - Zero migration overhead.
//   - Auditable in deploy config; rotating an admin is a redeploy,
//     not a SQL update.
//   - Right shape for v0 single-operator project. Move to a column
//     when there's a real admin role to manage in-app.

const RAW = process.env.ADMIN_EMAILS ?? '';
const ALLOWED = RAW.split(',')
  .map((e) => e.trim().toLowerCase())
  .filter((e) => e.length > 0);
const ALLOWED_SET = new Set<string>(ALLOWED);

export function isAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  return ALLOWED_SET.has(email.trim().toLowerCase());
}

export function adminEmailListForLog(): string {
  // For startup logs / debug only — never render to the client.
  return ALLOWED.length === 0 ? '<unset>' : `${ALLOWED.length} configured`;
}
