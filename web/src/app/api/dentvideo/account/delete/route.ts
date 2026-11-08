import { NextResponse } from "next/server";
import { z } from "zod";
import { dvSession } from "@/lib/dentvid/auth";
import { dvErrors } from "@/lib/dentvid/locale-server";
import { LIMITS } from "@/lib/rate-limit";
import { rateLimited } from "@/lib/rate-limit-server";
import { dvAdmin } from "@/lib/dentvid/supabase";
import { deleteDentvideoAccount } from "@/lib/dentvid/account";
import { accountErrors, ownClinic } from "@/lib/dentvid/account-route";
import { dodoApiKey, dodoCancelSubscription, dodoGetSubscription } from "@/lib/dentvid/dodo-account";

// POST /api/dentvideo/account/delete { confirm } — delete the signed-in
// clinic's account: subscription (cancelled via Dodo when DODO_API_KEY is
// set, else the clinic is asked to cancel first), storage folder, videos,
// clinic row, then the login. The user id comes from the session only; the
// service-role client is used with owner_id = that id on every step
// (lib/dentvid/account.ts). Safe to repeat after a partial failure.

const Body = z.object({ confirm: z.string().min(1).max(200) });

export async function POST(req: Request) {
  const { db, user } = await dvSession();
  if (!user) return NextResponse.json({ error: (await dvErrors()).signIn }, { status: 401 });
  const limited = await rateLimited([{ key: `rl:delete:user:${user.id}`, rule: LIMITS.accountDeleteUser }], async () => (await dvErrors()).tooMany);
  if (limited) return limited;

  const err = await accountErrors(await ownClinic(db, user.id));
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: err.deleteConfirm }, { status: 400 });

  const apiKey = dodoApiKey();
  const result = await deleteDentvideoAccount({
    admin: dvAdmin(),
    user: { id: user.id, email: user.email },
    confirm: parsed.data.confirm,
    dodo: apiKey
      ? { getSubscription: (id) => dodoGetSubscription({ apiKey }, id), cancelSubscription: (id) => dodoCancelSubscription({ apiKey }, id) }
      : null,
  });

  if (!result.ok) {
    if (result.reason === "confirm") return NextResponse.json({ error: err.deleteConfirm }, { status: 400 });
    if (result.reason === "subscription_active") return NextResponse.json({ error: err.deleteNeedsCancel, fallback: "email" }, { status: 409 });
    if (result.reason === "billing_failed") return NextResponse.json({ error: err.deleteBillingFailed }, { status: 502 });
    console.error("[dentvideo account] delete failed at", result.step);
    return NextResponse.json({ error: err.deleteFailed }, { status: 500 });
  }

  // The login is gone; clear this browser's session cookie too.
  await db.auth.signOut().catch(() => {});
  return NextResponse.json({ ok: true });
}
