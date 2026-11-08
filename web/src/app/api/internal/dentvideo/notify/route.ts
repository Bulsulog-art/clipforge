import { NextResponse } from "next/server";
import { z } from "zod";
import { dvAdmin } from "@/lib/dentvid/supabase";
import { workerAuthorised } from "@/lib/dentvid/internal-auth";
import { readyEmail, sendEmail } from "@/lib/dentvid/email";
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

  const db = dvAdmin();
  const { data: clinic } = await db.from("dentvid_clinics").select("owner_id, profile").eq("id", clinicId).maybeSingle();
  if (!clinic) return NextResponse.json({ error: "no clinic" }, { status: 404 });
  const { data: owner } = await db.auth.admin.getUserById(clinic.owner_id as string);
  const email = owner?.user?.email;
  if (!email) return NextResponse.json({ sent: false, reason: "no email" });

  const profile = clinic.profile as { name?: string; language?: string };
  const base = (process.env.NEXT_PUBLIC_DENTVIDEO_URL || `${(process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/+$/, "")}/dentvideo`).replace(/\/+$/, "");
  const msg = readyEmail({ kind, counts: { ready, flagged }, clinicName: profile.name ?? "", language: profile.language ?? "en", appUrl: `${base}/app` });
  if (!msg) return NextResponse.json({ sent: false, reason: "nothing ready" });
  const sent = await sendEmail(email, msg);
  return NextResponse.json({ sent });
}
