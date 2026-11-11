import { NextResponse } from "next/server";
import { z } from "zod";
import { dvAdmin } from "@/lib/dentvid/supabase";
import { workerAuthorised } from "@/lib/dentvid/internal-auth";
import { sendReadyNotice } from "@/lib/dentvid/ready-notice";
import { LIMITS } from "@/lib/rate-limit";
import { rateLimited } from "@/lib/rate-limit-server";

/**
 * Called by the worker when a clinic's week or recording is ready: emails
 * the clinic owner a "ready for your review" note in the clinic's language.
 * Authenticated with the shared WORKER_INTERNAL_TOKEN (Bearer), which also
 * exempts it from the browser Origin check.
 */
const Body = z.object({
  clinicId: z.string().uuid(),
  kind: z.enum(["week", "recording"]),
  ready: z.number().int().min(0),
  flagged: z.number().int().min(0),
});

export async function POST(req: Request) {
  if (!workerAuthorised(req.headers.get("authorization"))) return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad request" }, { status: 400 });
  const { clinicId, kind, ready, flagged } = parsed.data;
  // A worker bug (or a leaked token) must not turn into an email storm.
  const limited = await rateLimited(
    [
      { key: `rl:notify:clinic:${clinicId}`, rule: LIMITS.notifyClinic },
      { key: "rl:notify:global", rule: LIMITS.notifyGlobal },
    ],
    () => "too many notices",
  );
  if (limited) return limited;

  const res = await sendReadyNotice(dvAdmin(), clinicId, kind, { ready, flagged });
  if (res.reason === "no clinic") return NextResponse.json({ error: "no clinic" }, { status: 404 });
  if (res.reason === "no email" || res.reason === "nothing ready") return NextResponse.json({ sent: false, reason: res.reason });
  return NextResponse.json({ sent: res.sent });
}
