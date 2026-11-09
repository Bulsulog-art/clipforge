/**
 * A photo re-render ("restyle") that has been queued for longer than this has
 * been lost (worker restart, queue flush, a job that died before it could mark
 * the card): the card shows it as failed and the clinic can try again, instead
 * of "updating…" forever.
 */
export const RESTYLE_STALE_MS = 30 * 60_000;

/** The restyle state the clinic should see: a stale "queued" reads as "failed". */
export function restyleStatus(
  status: string | null | undefined,
  requestedAt: string | null | undefined,
  now = Date.now(),
): "queued" | "failed" | null {
  if (status === "failed") return "failed";
  if (status !== "queued") return null;
  const at = Date.parse(requestedAt ?? "");
  // No timestamp: an old row from before it was written — treat it as lost too.
  if (!Number.isFinite(at) || now - at > RESTYLE_STALE_MS) return "failed";
  return "queued";
}
