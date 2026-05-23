import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/referrals/apply
 *
 * Redeems a referral code on behalf of the authenticated user. All anti-abuse
 * checks (self-referral, inviter cap, double-redeem) live inside the
 * clipforge.redeem_referral RPC so they're atomic.
 */
const Body = z.object({
  code: z.string().min(4).max(16),
});

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  // Normalise: uppercase + strip whitespace so the user can paste sloppily.
  const code = body.code.toUpperCase().replace(/\s+/g, "");

  const { data, error } = await supabase.rpc("redeem_referral", { p_code: code });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  // The RPC returns a single row: { ok, error, inviter }
  const result = Array.isArray(data) ? data[0] : data;
  if (!result?.ok) {
    return NextResponse.json(
      { error: friendlyError(result?.error as string | undefined) },
      { status: 400 },
    );
  }
  return NextResponse.json({ ok: true, creditsGranted: 5 });
}

function friendlyError(code: string | undefined): string {
  switch (code) {
    case "code_not_found":      return "That code didn't match any active invite. Double-check the spelling.";
    case "self_referral":       return "You can't redeem your own code.";
    case "already_redeemed":    return "You've already redeemed a referral code on this account.";
    case "inviter_cap_reached": return "That code has been used by 20 people already — its cap is reached.";
    case "unauthenticated":     return "Please sign in before redeeming a code.";
    default:                    return code ?? "Couldn't redeem this code right now.";
  }
}
