import { NextResponse } from "next/server";
import { dvAdmin } from "@/lib/dentvid/supabase";
import { sendEmail } from "@/lib/dentvid/email";
import { workerAuthorised } from "@/lib/dentvid/internal-auth";
import { lifecycleConfig, runNudges, runPaying, supabaseLifecycleStore } from "@/lib/dentvid/lifecycle";
import { LIMITS } from "@/lib/rate-limit";
import { limitChecks, rateLimited } from "@/lib/rate-limit-server";

/**
 * Called hourly by the worker (BullMQ job "lifecycle", worker/src/dentvid/
 * lifecycle.ts): sends the activation emails to unpaid clinics, then the
 * weekly posting nudge and monthly summary to paying clinics, each only in
 * the clinic's own daytime (lib/dentvid/lifecycle.ts). Authenticated with
 * WORKER_INTERNAL_TOKEN.
 * Without RESEND_API_KEY nothing is selected or claimed.
 */
export async function POST(req: Request) {
  if (!workerAuthorised(req.headers.get("authorization"))) return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  const limited = await rateLimited([{ key: "rl:lifecycle:run", rule: LIMITS.lifecycleRun }], () => "too many runs");
  if (limited) return limited;
  if (!process.env.RESEND_API_KEY) return NextResponse.json({ stopped: "no email key" });

  const db = dvAdmin();
  const config = lifecycleConfig();
  const store = supabaseLifecycleStore(db);
  const allow = async () => (await limitChecks([{ key: "rl:lifecycle:global", rule: LIMITS.lifecycleGlobal }])).ok;
  const activation = await runNudges({ store, send: sendEmail, allow, config });
  const paying = activation.stopped === "hourly cap" ? null : await runPaying({ store, send: sendEmail, allow, config });
  const result = { ...activation, paying };
  if (activation.sent || activation.failed || activation.stopped === "hourly cap" || paying?.sent || paying?.failed) console.info("[dentvideo] lifecycle run", JSON.stringify(result));
  return NextResponse.json(result);
}
