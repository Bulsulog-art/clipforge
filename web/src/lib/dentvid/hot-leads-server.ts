import { alerts, MemoryOpsStore, type DeliverResult, type OpsStore } from "./ops-alert";
import { raiseOwnerAlert, webOpsStore } from "./ops-server";
import { HOT_LEAD_GATE_TTL_SEC, UNCAPPED_STEPS, hotLeadCaps, hotLeadDayKey, hotLeadGateKey, hotLeadHourKey, isBotUserAgent, type HotStep } from "./hot-leads";
import { demoLanguage, demoPath, isDemoActive, type DemoRow } from "./demos";
import { loadDemoRow } from "./demos-server";
import { isAdminUser } from "./admin";
import { dvUrl } from "./host";

/**
 * Hot-lead alerts, the I/O half (rules in hot-leads.ts): who is asking
 * (a bot? the owner himself?) and raising the owner alert once per demo
 * and step through the shared owner-alert system (ops-alert.ts / ops-server.ts).
 * Best effort: never throws, never slows the request it is called from
 * (routes call it with `void`).
 */

/** Is the request from a signed-in admin (DENTVIDEO_ADMIN_USER_IDS)? False on any doubt. */
export async function isAdminRequest(): Promise<boolean> {
  try {
    const { dvSession } = await import("./auth");
    const { user } = await dvSession();
    return !!user && isAdminUser(user.id);
  } catch {
    return false;
  }
}

/**
 * Why a demo request must not count (no view, no event, no alert): "bot"
 * for link-preview crawlers, search bots and scripts (by user agent),
 * "admin" for the owner opening his own demo. Null for a prospect.
 */
export async function demoRequestSkip(req: Request): Promise<"bot" | "admin" | null> {
  if (isBotUserAgent(req.headers.get("user-agent"))) return "bot";
  if (await isAdminRequest()) return "admin";
  return null;
}

/* ------------------------------------------------------------------ store */

// When Redis is missing or down, a per-process memory store keeps the gates
// and caps (so a Redis outage is never a storm — at worst one repeat per process).
const local = new MemoryOpsStore();
export function _resetHotLeadsForTests() {
  local.kv.clear();
  local.lists.clear();
}

function resilient(store: OpsStore | null): Pick<OpsStore, "setNx" | "incr" | "del"> {
  return {
    async setNx(key, ttl) {
      try {
        if (store) return await store.setNx(key, ttl);
      } catch {
        // fall back
      }
      return local.setNx(key, ttl);
    },
    async incr(key, ttl) {
      try {
        if (store) return await store.incr(key, ttl);
      } catch {
        // fall back
      }
      return local.incr(key, ttl);
    },
    async del(key) {
      await local.del(key);
      try {
        if (store) await store.del(key);
      } catch {
        // best effort
      }
    },
  };
}

export type HotLeadResult = DeliverResult | "duplicate" | "capped" | "no_demo";

/**
 * Tell the owner a prospect reached `step` on a demo — the first time only.
 * `demo` is the row when the caller already has it (the view route does);
 * `views` overrides its view count (the view just counted).
 */
export async function raiseHotLead(input: { token: string; step: HotStep; demo?: DemoRow | null; views?: number; clinicId?: string | null; now?: Date }): Promise<HotLeadResult> {
  const now = input.now ?? new Date();
  try {
    const store = resilient(await webOpsStore().catch(() => null));
    const gate = hotLeadGateKey(input.token, input.step);
    if (!(await store.setNx(gate, HOT_LEAD_GATE_TTL_SEC))) return "duplicate";

    const demo = input.demo ?? (await loadDemoRow(input.token).catch(() => null));
    // A sign-up keeps its credit whatever the demo's state; the other steps only happen on a live page.
    if (!demo || (input.step !== "signup" && !isDemoActive(demo, now))) {
      await store.del(gate);
      return "no_demo";
    }

    if (!UNCAPPED_STEPS.includes(input.step)) {
      const caps = hotLeadCaps(process.env);
      // The gate stays taken when capped: a capped step is shown on /admin/demos, never mailed later.
      if ((await store.incr(hotLeadDayKey(now), 2 * 86_400)) > caps.perDay) {
        console.warn("[dentvideo hot-lead] daily cap reached", JSON.stringify({ token: input.token, step: input.step }));
        return "capped";
      }
      if ((await store.incr(hotLeadHourKey(now), 2 * 3600)) > caps.perHour) {
        console.warn("[dentvideo hot-lead] hourly cap reached", JSON.stringify({ token: input.token, step: input.step }));
        return "capped";
      }
    }

    const res = await raiseOwnerAlert(
      alerts.hotLead({
        token: demo.token,
        step: input.step,
        clinicName: demo.clinic_name,
        city: demo.city,
        country: demo.country,
        campaign: demo.campaign,
        views: input.views ?? demo.view_count ?? 0,
        at: now.toISOString(),
        url: dvUrl(demoPath(demo.token, demoLanguage(demo.language))),
        clinicId: input.clinicId ?? null,
      }),
    );
    // Not delivered (Resend down, owner-alert hour muted): the next time this step happens it may alert.
    if (res === "failed" || res === "muted") await store.del(gate);
    return res;
  } catch {
    return "failed";
  }
}
