import { NextResponse } from "next/server";
import { z } from "zod";
import { dvAdmin } from "@/lib/dentvid/supabase";
import { workerAuthorised } from "@/lib/dentvid/internal-auth";
import { sendReadyNotice } from "@/lib/dentvid/ready-notice";
import { sendDelayNotice } from "@/lib/dentvid/delay-notice";
import { sendReadyPush } from "@/lib/dentvid/apns";
import { LIMITS } from "@/lib/rate-limit";
import { rateLimited } from "@/lib/rate-limit-server";

/**
 * Called by the worker:
 *   week | recording   a clinic's week or recording is ready: emails the
 *                      clinic owner a "ready for your review" note in the
 *                      clinic's language, and pushes the same notice to the
 *                      owner's iPhones (lib/dentvid/apns.ts);
 *   late | first-late  a watchdog found the clinic's week late: one calm
 *                      "running late" email (lib/dentvid/delay-notice.ts).
 *                      The worker asks once per clinic and week, and says
 *                      whether the week is really queued (`queued`; absent
 *                      reads as not, so the email never claims it wrongly).
 * Authenticated with the shared WORKER_INTERNAL_TOKEN (Bearer), which also
 * exempts it from the browser Origin check. Every kind shares the same rate
 * limits, so a worker bug (or a leaked token) cannot become an email storm.
 *
 * Answers the worker reads (worker/src/dentvid/notify.ts): {sent: true};
 * {sent: false, reason} when it decided not to send (final); {sent: false}
 * when the email provider failed (worth a retry); 404 for an unknown clinic.
 */
const Week = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const Body = z.union([
  z.object({
    clinicId: z.string().uuid(),
    kind: z.enum(["week", "recording"]),
    ready: z.number().int().min(0),
    flagged: z.number().int().min(0),
    week: Week.optional(),
  }),
  z.object({
    clinicId: z.string().uuid(),
    kind: z.enum(["late", "first-late"]),
    week: Week.optional(),
    queued: z.boolean().optional(),
  }),
]);

/** Reasons the web app decided not to send: final, the worker does not retry them. */
const FINAL = new Set(["no email", "test account", "nothing ready", "already delivered", "not active"]);

export async function POST(req: Request) {
  if (!workerAuthorised(req.headers.get("authorization"))) return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad request" }, { status: 400 });
  const body = parsed.data;
  const { clinicId } = body;
  const limited = await rateLimited(
    [
      { key: `rl:notify:clinic:${clinicId}`, rule: LIMITS.notifyClinic },
      { key: "rl:notify:global", rule: LIMITS.notifyGlobal },
    ],
    () => "too many notices",
  );
  if (limited) return limited;

  const admin = dvAdmin();
  if (!("ready" in body)) {
    const res = await sendDelayNotice(admin, clinicId, body.kind, { week: body.week ?? null, queued: body.queued === true });
    return answer(res);
  }
  const { kind, ready, flagged } = body;
  const res = await sendReadyNotice(admin, clinicId, kind, { ready, flagged });
  // The iPhone app's push: independent of the email (a bounced address still gets the push). Never throws.
  if (res.reason !== "no clinic") await sendReadyPush(admin, clinicId, kind, { ready, flagged });
  return answer(res);
}

function answer(res: { sent: boolean; reason?: string }) {
  if (res.reason === "no clinic") return NextResponse.json({ error: "no clinic" }, { status: 404 });
  // A test account used to come back as a bare {sent: false}, which the worker reads as a
  // provider failure and retried for hours; it is a decision, like no address.
  if (res.reason && FINAL.has(res.reason)) return NextResponse.json({ sent: false, reason: res.reason });
  return NextResponse.json({ sent: res.sent });
}
