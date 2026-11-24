import type { OpsStore, OwnerAlert } from "./ops-alert";

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
 * alert ("asked to delete the account in the last hour or two") stays true. When Dodo then refuses
 * the cancel, nothing is deleted and the route takes the key away again (clearAccountDeleting): the
 * account is not being deleted after all, and a cancellation the owner makes later must be confirmed.
 * When the key cannot be written, the owner hears about it (deletionBlockedAlert), so a Redis outage
 * never holds up a clinic's request to be deleted without anyone knowing.
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

/** Takes the mark away again: the deletion stopped before anything was cancelled or deleted. Never throws. */
export async function clearAccountDeleting(ops: OpsStore | null, ownerId: string): Promise<void> {
  if (!ops) return;
  await ops.del(deletionMarkKey(ownerId)).catch(() => {});
}

/**
 * The owner's alert when a paying clinic's deletion stopped because the mark could not be written (Redis is
 * configured but did not answer): nothing was cancelled or deleted, and the clinic was asked to try again.
 */
export function deletionBlockedAlert(a: { ownerId: string; clinicId?: string | null; name?: string | null; email?: string | null }): OwnerAlert {
  return {
    key: `account_delete_blocked:${a.clinicId ?? a.ownerId}`,
    severity: "warning",
    titleTr: "Hesap silme durdu: Redis yanıt vermedi",
    titleEn: "A clinic could not delete its account: Redis did not answer",
    ...(a.clinicId ? { clinic: { id: a.clinicId, name: a.name ?? null, email: a.email ?? null } } : {}),
    what: [
      "A paying clinic asked to delete its account. Before its Dodo subscription is cancelled, the account is marked in Redis as being deleted, so that Dodo's cancellation webhook does not email the clinic about a library that is being removed. Redis is configured but did not take the mark.",
    ],
    done: ["Nothing was cancelled at Dodo and nothing was deleted. The clinic was asked to try again in a moment."],
    todo: [
      "Check Redis (REDIS_URL) on the web app. Once it answers, the clinic can delete its account itself.",
      `If the account is still there tomorrow, write to ${a.email ?? "the clinic"}: it asked to be deleted, and that request should not wait.`,
    ],
  };
}
