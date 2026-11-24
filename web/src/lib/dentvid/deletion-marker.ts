import type { OpsStore } from "./ops-alert";

/**
 * "This account is being deleted": a Redis key the account-deletion route writes right before
 * it cancels the clinic's Dodo subscription (handlers/account-delete.ts), and that the billing
 * webhook and the confirmation sender read before they tell the clinic "your plan ends on
 * {end}, your library stays until {library}" (billing-webhook.ts cancelHold,
 * billing-confirm-email.ts sendBillingConfirmation). Deletion cancels Dodo first and only then
 * removes the library and the clinic row, so Dodo's subscription.cancelled can arrive while the
 * clinic still looks active; without the key, that email would promise a library that is being
 * deleted.
 *
 * Why a key of its own: the route's request count (billing-confirm-checks.ts deletionRequested)
 * comes from the rate limiter, which lets a request through uncounted when Redis does not answer
 * in time. This key is written on purpose and read back, and when it cannot be written the route
 * does not cancel Dodo at all (nothing is deleted; the clinic is asked to try again in a moment).
 * Without Redis configured there is nothing to write and nothing to read: the webhook then cannot
 * check, and holds the email back ("not checked").
 *
 * It lives as long as the request count it stands next to (an hour or two), so the owner's
 * alert ("asked to delete the account in the last hour or two") stays true.
 */

export const DELETION_MARK_TTL_S = 2 * 3600;
export const deletionMarkKey = (ownerId: string) => `dv:deleting:${ownerId.trim().toLowerCase()}`;

export type MarkResult = "marked" | "no store" | "failed";

/**
 * Writes the key and reads it back; one more try shortly after when the connection is still opening.
 * "no store": Redis is not configured. "failed": configured, but the key could not be written.
 */
export async function markAccountDeleting(ops: OpsStore | null, ownerId: string, now: Date, opts: { retryMs?: number } = {}): Promise<MarkResult> {
  if (!ops) return "no store";
  const key = deletionMarkKey(ownerId);
  const attempt = async () => {
    await ops.set(key, now.toISOString(), DELETION_MARK_TTL_S);
    return (await ops.get(key)) !== null;
  };
  for (let i = 0; i < 2; i++) {
    try {
      if (await attempt()) return "marked";
    } catch {
      // Not ready yet, or a blip: one more try.
    }
    if (i === 0) await new Promise((r) => setTimeout(r, opts.retryMs ?? 300));
  }
  return "failed";
}

/** Is this owner's account being deleted? null: unknown (no store, or it could not be read). */
export async function accountDeleting(ops: OpsStore | null, ownerId: string): Promise<boolean | null> {
  if (!ops) return null;
  try {
    return (await ops.get(deletionMarkKey(ownerId))) !== null;
  } catch {
    return null;
  }
}
