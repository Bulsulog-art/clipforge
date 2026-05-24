import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/promo/redeem
 *
 * Atomic redemption is in clipforge.redeem_promo (SECURITY DEFINER).
 * This route just maps the RPC's structured error codes to friendly
 * copy + bubbles the credits-granted count back to the iOS UI.
 */
const Body = z.object({ code: z.string().min(3).max(32) });

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: z.infer<typeof Body>;
  try { body = Body.parse(await req.json()); }
  catch { return NextResponse.json({ error: "Invalid body" }, { status: 400 }); }

  const { data, error } = await supabase.rpc("redeem_promo", { p_code: body.code });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const result = Array.isArray(data) ? data[0] : data;
  if (!result?.ok) {
    return NextResponse.json(
      { error: friendly(result?.error as string | undefined) },
      { status: 400 },
    );
  }
  return NextResponse.json({ ok: true, creditsGranted: result.credits });
}

function friendly(code: string | undefined): string {
  switch (code) {
    case "code_not_found":   return "We couldn't find that code — double-check the spelling.";
    case "code_expired":     return "That promo code has expired.";
    case "code_exhausted":   return "That promo code has been fully redeemed.";
    case "already_redeemed": return "You've already redeemed this code.";
    case "unauthenticated":  return "Please sign in before redeeming a code.";
    default:                 return code ?? "Couldn't redeem this code right now.";
  }
}
