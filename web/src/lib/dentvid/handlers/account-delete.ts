import { NextResponse } from "next/server";
import { z } from "zod";
import type { DvActor } from "@/lib/dentvid/handlers/item-patch";
import { dvErrors, dvLocale } from "@/lib/dentvid/locale-server";
import { appStoreText } from "@/content/dentvideo-app-store";
import { APP_STORE_MANAGE_URL } from "@/lib/dentvid/apple-billing";
import { LIMITS } from "@/lib/rate-limit";
import { rateLimited } from "@/lib/rate-limit-server";
import { dvAdmin } from "@/lib/dentvid/supabase";
import { deleteDentvideoAccount } from "@/lib/dentvid/account";
import { accountErrors, ownClinic } from "@/lib/dentvid/account-route";
import { dodoApiKey, dodoCancelSubscription, dodoGetSubscription } from "@/lib/dentvid/dodo-account";
import { clearAccountDeleting, deletionBlockedAlert, markAccountDeleting } from "@/lib/dentvid/deletion-marker";
import { raiseOwnerAlert, webOpsStore } from "@/lib/dentvid/ops-server";

// POST /api/dentvideo/account/delete { confirm } — delete the signed-in
// clinic's account: subscription (cancelled via Dodo when DODO_API_KEY is
// set, else the clinic is asked to cancel first), storage folder, videos,
// clinic row, then the login. The user id comes from the session only; the
// service-role client is used with owner_id = that id on every step
// (lib/dentvid/account.ts). Safe to repeat after a partial failure.
//
// Right before Dodo is asked to cancel, the account is marked as being deleted
// (lib/dentvid/deletion-marker.ts): Dodo's cancellation webhook can arrive
// while the clinic row still exists, and must not send the clinic a "your
// library stays 90 days" confirmation. When Redis is configured but the mark
// cannot be written, Dodo is not called: nothing is cancelled or deleted, the
// clinic is asked to try again in a moment (deleteBillingFailed), and the owner
// is told. When Dodo refuses the cancel, nothing is deleted either, and the mark
// is taken away again.

const Body = z.object({ confirm: z.string().min(1).max(200) });

/** Delete the signed-in clinic's account. Shared by the web route (cookie) and the iPhone app's route (bearer). */
export async function deleteAccount({ db, user }: DvActor, req: Request): Promise<NextResponse> {
  const limited = await rateLimited([{ key: `rl:delete:user:${user.id}`, rule: LIMITS.accountDeleteUser }], async () => (await dvErrors()).tooMany);
  if (limited) return limited;

  const own = await ownClinic(db, user.id);
  const err = await accountErrors(own);
  const language = (own?.profile as { language?: string } | undefined)?.language;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: err.deleteConfirm }, { status: 400 });

  const apiKey = dodoApiKey();
  const result = await deleteDentvideoAccount({
    admin: dvAdmin(),
    user: { id: user.id, email: user.email },
    confirm: parsed.data.confirm,
    dodo: apiKey
      ? {
          getSubscription: (id) => dodoGetSubscription({ apiKey }, id),
          cancelSubscription: async (id) => {
            const ops = await webOpsStore().catch(() => null);
            const mark = await markAccountDeleting(ops, user.id, new Date());
            if (mark === "failed") {
              console.error("[dentvideo account] delete stopped before Dodo: Redis is configured but the deletion mark could not be written");
              const clinicId = typeof own?.id === "string" ? own.id : null;
              const name = (own?.profile as { name?: string } | undefined)?.name ?? null;
              void raiseOwnerAlert(deletionBlockedAlert({ ownerId: user.id, clinicId, name, email: user.email ?? null })).catch(() => {});
              throw new Error("account deletion: could not mark the account before cancelling Dodo");
            }
            try {
              await dodoCancelSubscription({ apiKey }, id);
            } catch (e) {
              // Nothing is deleted now (billing_failed): the account is not being deleted after all.
              if (mark === "marked") await clearAccountDeleting(ops, user.id);
              throw e;
            }
          },
        }
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
  // An App Store subscription keeps running until the customer cancels it in Settings (Apple's rule: say so).
  if (result.appStoreSubscription) {
    const notice = appStoreText(await dvLocale(language)).deleteNotice;
    return NextResponse.json({ ok: true, appStoreSubscription: true, notice, manageUrl: APP_STORE_MANAGE_URL });
  }
  return NextResponse.json({ ok: true });
}
