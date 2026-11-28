import { createHash, timingSafeEqual } from "node:crypto";

/**
 * The automated sales agent (POST /api/dentvideo/agent/demos):
 * "Authorization: Bearer <DENTVIDEO_AGENT_TOKEN>", compared in constant time.
 *
 * Fail closed: unless DENTVIDEO_AGENT_TOKEN is set to at least 32 characters
 * AND DENTVIDEO_AGENT_USER_ID is a UUID (dentvid_demos.created_by is a uuid
 * column, so the agent's demos are recorded under that id), nobody is let in.
 * Pure, so the rule is unit-tested.
 */
export const AGENT_TOKEN_MIN_LENGTH = 32;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** Both sides hashed first, so the compare takes the same time whatever the lengths. */
function sameSecret(got: string, expected: string): boolean {
  const a = createHash("sha256").update(got).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b) && got.length === expected.length;
}

/** The agent's creator id when the request carries the configured token, else null. */
export function agentActor(
  authorization: string | null,
  env: Record<string, string | undefined> = process.env,
): { userId: string } | null {
  const expected = env.DENTVIDEO_AGENT_TOKEN ?? "";
  const userId = (env.DENTVIDEO_AGENT_USER_ID ?? "").trim().toLowerCase();
  if (expected.length < AGENT_TOKEN_MIN_LENGTH || !UUID.test(userId)) return null;
  const m = /^Bearer\s+(\S+)\s*$/i.exec(authorization ?? "");
  if (!m) return null;
  return sameSecret(m[1], expected) ? { userId } : null;
}
