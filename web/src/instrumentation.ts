/**
 * Server error hook. No third-party error reporting is used (Sentry was removed on
 * 2026-11-25: it was never enabled in production and is not a listed sub-processor).
 */
export async function onRequestError(error: unknown, request: { path?: string }, context: { routePath?: string }) {
  // Count server errors for the owner's hourly 5xx spike alert (lib/dentvid/ops-server.ts).
  // Node runtime only (Redis).
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  try {
    const { noteServerError } = await import("./lib/dentvid/ops-server");
    await noteServerError(context?.routePath ?? request?.path?.split("?")[0] ?? "unknown");
  } catch {
    // best effort
  }
  void error;
}
