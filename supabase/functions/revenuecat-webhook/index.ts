// supabase/functions/revenuecat-webhook/index.ts
// Tip: web tarafında zaten bir Next.js route var; bu Edge Function alternatif.
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const ENT_TO_TIER: Record<string, string> = { starter: "starter", pro: "pro", agency: "agency" };

serve(async (req) => {
  if (req.headers.get("authorization") !== `Bearer ${Deno.env.get("REVENUECAT_WEBHOOK_AUTH")}`) {
    return new Response("unauthorized", { status: 401 });
  }
  const body = await req.json();
  const evt = body.event;
  if (!evt) return new Response("ok");

  const isActive = ["INITIAL_PURCHASE", "RENEWAL", "PRODUCT_CHANGE", "UNCANCELLATION"].includes(evt.type);
  const isInactive = ["CANCELLATION", "EXPIRATION", "BILLING_ISSUE", "REFUND"].includes(evt.type);

  let tier = "free";
  if (isActive && evt.entitlement_ids?.length) {
    const ranks = { free: 0, starter: 1, pro: 2, agency: 3 } as const;
    for (const id of evt.entitlement_ids) {
      const t = ENT_TO_TIER[id];
      if (t && ranks[t as keyof typeof ranks] > ranks[tier as keyof typeof ranks]) tier = t;
    }
  }
  if (isInactive) tier = "free";

  await supabase.from("profiles")
    .update({ tier, revenuecat_app_user_id: evt.app_user_id })
    .eq("revenuecat_app_user_id", evt.app_user_id);

  return new Response("ok");
});
