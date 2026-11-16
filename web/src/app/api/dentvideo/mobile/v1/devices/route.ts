import { NextResponse } from "next/server";
import { withMobileSession } from "@/lib/dentvid/mobile-auth";
import { DeviceBody, DeviceDelete, deleteDevice, upsertDevice } from "@/lib/dentvid/mobile";
import { dvAdmin } from "@/lib/dentvid/supabase";
import { LIMITS } from "@/lib/rate-limit";
import { rateLimited } from "@/lib/rate-limit-server";

/**
 * POST   /api/dentvideo/mobile/v1/devices { token, environment, locale?, readyPush } — this phone's
 *        APNs token and its "week is ready" setting, stored under the session's own user id.
 * DELETE /api/dentvideo/mobile/v1/devices { token } — forget it (only the caller's own row).
 */
export const dynamic = "force-dynamic";

async function limit(userId: string) {
  return rateLimited([{ key: `rl:mdevices:user:${userId}`, rule: LIMITS.mobileDevicesUser }], () => "Too many requests");
}

export async function POST(req: Request) {
  return withMobileSession(req, async ({ user }) => {
    const limited = await limit(user.id);
    if (limited) return limited;
    const parsed = DeviceBody.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "Invalid device", code: "invalid_device" }, { status: 400 });
    const r = await upsertDevice(dvAdmin(), user.id, parsed.data);
    if (!r.ok) return NextResponse.json({ error: "Could not save", code: "save_failed" }, { status: 500 });
    return NextResponse.json(r);
  });
}

export async function DELETE(req: Request) {
  return withMobileSession(req, async ({ user }) => {
    const limited = await limit(user.id);
    if (limited) return limited;
    const parsed = DeviceDelete.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "Invalid device", code: "invalid_device" }, { status: 400 });
    const r = await deleteDevice(dvAdmin(), user.id, parsed.data.token);
    if (!r.ok) return NextResponse.json({ error: "Could not save", code: "save_failed" }, { status: 500 });
    return NextResponse.json({ ok: true });
  });
}
