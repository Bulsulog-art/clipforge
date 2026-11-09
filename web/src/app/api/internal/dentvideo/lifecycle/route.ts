import { NextResponse } from "next/server";
import { dvAdmin } from "@/lib/dentvid/supabase";
import { sendEmail } from "@/lib/dentvid/email";
import { workerAuthorised } from "@/lib/dentvid/internal-auth";
import { lifecycleConfig, runNudges, supabaseLifecycleStore } from "@/lib/dentvid/lifecycle";
import { loadFoundingState } from "@/lib/dentvid/subscriptions";
import { LIMITS } from "@/lib/rate-limit";
import { limitChecks, rateLimited } from "@/lib/rate-limit-server";

/**
 * Called hourly by the worker (BullMQ job "lifecycle", worker/src/dentvid/
 * lifecycle.ts): sends the unpaid-clinic reminders that are due
 * (lib/dentvid/lifecycle.ts). Authenticated with WORKER_INTERNAL_TOKEN.
 * Without RESEND_API_KEY nothing is selected or claimed.
 */
export async function POST(req: Request) {
  if (!workerAuthorised(req.headers.get("authorization"))) return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  const limited = await rateLimited([{ key: "rl:lifecycle:run", rule: LIMITS.lifecycleRun }], () => "too many runs");
  if (limited) return limited;
  if (!process.env.RESEND_API_KEY) return NextResponse.json({ stopped: "no email key" });

  const db = dvAdmin();
  // The last reminder names the founding offer only while seats are left (closed at 100 automatically).
  const founding = await loadFoundingState(db);
  const env = founding.open ? process.env : { ...process.env, DENTVIDEO_FOUNDING_OFFER: "off" };
  const result = await runNudges({
    store: supabaseLifecycleStore(db),
    send: sendEmail,
    allow: async () => (await limitChecks([{ key: "rl:lifecycle:global", rule: LIMITS.lifecycleGlobal }])).ok,
    config: lifecycleConfig(env),
  });
  if (result.sent || result.failed || result.stopped === "hourly cap") console.info("[dentvideo] lifecycle run", JSON.stringify(result));
  return NextResponse.json(result);
}
