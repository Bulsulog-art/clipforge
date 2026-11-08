/**
 * Who may open the owner dashboard (/dentvideo/admin): the emails in
 * DENTVIDEO_ADMIN_EMAILS (comma, semicolon or space separated, any case).
 * Empty or unset → nobody. Pure, so the rule is unit-tested.
 */
export function adminEmails(env: Record<string, string | undefined> = process.env): string[] {
  return (env.DENTVIDEO_ADMIN_EMAILS ?? "")
    .split(/[\s,;]+/)
    .map((e) => e.trim().toLowerCase())
    .filter((e) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e));
}

export function isAdminEmail(email: string | null | undefined, env: Record<string, string | undefined> = process.env): boolean {
  const e = (email ?? "").trim().toLowerCase();
  if (!e) return false;
  return adminEmails(env).includes(e);
}
