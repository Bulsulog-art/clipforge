import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

type RCEvent = {
  type: string;
  app_user_id: string;
  product_id?: string;
  entitlement_ids?: string[];
  expiration_at_ms?: number;
};

const ENTITLEMENT_TO_TIER: Record<string, "starter" | "pro" | "agency"> = {
  starter: "starter",
  pro: "pro",
  agency: "agency",
};

export async function POST(req: Request) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.REVENUECAT_WEBHOOK_AUTH}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const payload = (await req.json()) as { event: RCEvent };
  const evt = payload.event;
  if (!evt) return NextResponse.json({ ok: true });

  const svc = createServiceClient();

  const isActive =
    evt.type === "INITIAL_PURCHASE" ||
    evt.type === "RENEWAL" ||
    evt.type === "PRODUCT_CHANGE" ||
    evt.type === "UNCANCELLATION";
  const isInactive =
    evt.type === "CANCELLATION" ||
    evt.type === "EXPIRATION" ||
    evt.type === "BILLING_ISSUE" ||
    evt.type === "REFUND";

  let tier: "free" | "starter" | "pro" | "agency" = "free";
  if (isActive && evt.entitlement_ids?.length) {
    for (const id of evt.entitlement_ids) {
      if (ENTITLEMENT_TO_TIER[id]) {
        const candidate = ENTITLEMENT_TO_TIER[id];
        if (rank(candidate) > rank(tier)) tier = candidate;
      }
    }
  }
  if (isInactive) tier = "free";

  await svc
    .from("profiles")
    .update({ tier, revenuecat_app_user_id: evt.app_user_id })
    .eq("revenuecat_app_user_id", evt.app_user_id);

  return NextResponse.json({ ok: true });
}

function rank(t: string) {
  return ({ free: 0, starter: 1, pro: 2, agency: 3 } as const)[t as "free"] ?? 0;
}
