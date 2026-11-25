/**
 * Server error hook. No third-party error reporting is used (Sentry was removed on
 * 2026-11-25: it was never enabled in production and is not a listed sub-processor).
 */
export async function onRequestError(error: unknown, request: { path?: string }, context: { routePath?: string }) {
  void error;
  // Count server errors for the owner's hourly 5xx spike alert (lib/dentvid/ops-server.ts).
  // Node runtime only (Redis). The import must stay inside this check: Next replaces
  // NEXT_RUNTIME at build time and drops the branch from the edge bundle, which cannot load ioredis.
  if (process.env.NEXT_RUNTIME === "nodejs") {
    try {
      const { noteServerError } = await import("./lib/dentvid/ops-server");
      await noteServerError(context?.routePath ?? request?.path?.split("?")[0] ?? "unknown");
    } catch {
      // best effort
    }
  }
}
