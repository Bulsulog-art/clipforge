/**
 * Who may open the owner dashboard (/dentvideo/admin): the Liman auth user
 * ids in DENTVIDEO_ADMIN_USER_IDS (comma, semicolon or space separated).
 * Empty or unset → nobody. Pure, so the rule is unit-tested.
 *
 * Ids, not emails: DentVideo sign-up creates confirmed accounts without an
 * email check, so anyone could register an admin's address before the admin
 * does. A user id is assigned by Liman and cannot be chosen by a visitor.
 */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export function adminUserIds(env: Record<string, string | undefined> = process.env): string[] {
  return (env.DENTVIDEO_ADMIN_USER_IDS ?? "")
    .split(/[\s,;]+/)
    .map((id) => id.trim().toLowerCase())
    .filter((id) => UUID.test(id));
}

export function isAdminUser(userId: string | null | undefined, env: Record<string, string | undefined> = process.env): boolean {
  const id = (userId ?? "").trim().toLowerCase();
  if (!UUID.test(id)) return false;
  return adminUserIds(env).includes(id);
}
