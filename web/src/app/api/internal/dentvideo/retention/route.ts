import { NextResponse } from "next/server";
import { z } from "zod";
import { dvAdmin } from "@/lib/dentvid/supabase";
import { sendEmail } from "@/lib/dentvid/email";
import { workerAuthorised } from "@/lib/dentvid/internal-auth";
import { lifecycleConfig, supabaseLifecycleStore } from "@/lib/dentvid/lifecycle";
import { sendRetentionNotice } from "@/lib/dentvid/retention-email";
import { LIMITS } from "@/lib/rate-limit";
import { rateLimited } from "@/lib/rate-limit-server";

/**
 * Called by the worker's daily retention run (worker/src/dentvid/retention.ts):
 * emails a clinic whose plan ended that its videos will be deleted — 14 days
 * and 1 day before (lib/dentvid/retention-email.ts). Authenticated with
 * WORKER_INTERNAL_TOKEN. The answer tells the worker whether trying again
 * could help (`final`).
 */
const Body = z.object({
  clinicId: z.string().uuid(),
  days: z.union([z.literal(14), z.literal(1)]),
  deleteOn: z.string().datetime(),
  endedAt: z.string().datetime({ offset: true }),
});

export async function POST(req: Request) {
  if (!workerAuthorised(req.headers.get("authorization"))) return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad request" }, { status: 400 });
  const { clinicId, days, deleteOn, endedAt } = parsed.data;
  // A worker bug (or a leaked token) must not turn into an email storm.
  const limited = await rateLimited(
    [
      { key: `rl:notify:clinic:${clinicId}`, rule: LIMITS.notifyClinic },
      { key: "rl:notify:global", rule: LIMITS.notifyGlobal },
    ],
    () => "too many notices",
  );
  if (limited) return limited;
  if (!process.env.RESEND_API_KEY) return NextResponse.json({ sent: false, final: false, reason: "no email key" });
  const store = supabaseLifecycleStore(dvAdmin());
  const res = await sendRetentionNotice({ store, send: sendEmail, config: lifecycleConfig() }, { clinicId, days, deleteOn: new Date(deleteOn), endedAt });
  return NextResponse.json(res);
}
