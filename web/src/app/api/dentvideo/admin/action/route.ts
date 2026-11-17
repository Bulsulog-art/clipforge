import { handleAdminAction } from "@/lib/dentvid/admin-action-route";
import { recordAdminAction } from "@/lib/dentvid/admin-audit";
import { adminViewer } from "@/lib/dentvid/admin-server";
import { sendReadyNotice } from "@/lib/dentvid/ready-notice";
import { dvAdmin } from "@/lib/dentvid/supabase";
import { dentvidQueue, queueByName } from "@/lib/queue";
import { allowedOrigins } from "@/lib/origin-guard";
import { LIMITS } from "@/lib/rate-limit";
import { limitChecks } from "@/lib/rate-limit-server";

export const dynamic = "force-dynamic";

function serviceDb() {
  try {
    return dvAdmin();
  } catch {
    return null;
  }
}

/**
 * Owner admin panel actions (lib/dentvid/admin-action-route.ts has the
 * checks: admin → same origin → CSRF token → confirmation → rate limit →
 * action → audit). Only POST; anything else is the framework's 405.
 * The service role and the queues are touched only once every check passed.
 */
export async function POST(req: Request) {
  return handleAdminAction(req, {
    viewer: adminViewer,
    allowedOrigins: allowedOrigins(process.env),
    limit: async (adminId) => (await limitChecks([{ key: `rl:admin:action:${adminId}`, rule: LIMITS.adminAction }])).ok,
    actions: () => {
      const db = dvAdmin();
      return {
        db,
        dentvid: dentvidQueue,
        queueFor: (name) => queueByName(name),
        sendReady: async (clinicId, counts) => {
          // Same per-clinic cap as the worker's notices.
          const lim = await limitChecks([{ key: `rl:notify:clinic:${clinicId}`, rule: LIMITS.notifyClinic }]);
          if (!lim.ok) return { sent: false, reason: "send failed" };
          return sendReadyNotice(db, clinicId, "week", counts, { recordFunnel: false });
        },
      };
    },
    audit: (entry) => recordAdminAction(serviceDb(), entry),
  });
}
