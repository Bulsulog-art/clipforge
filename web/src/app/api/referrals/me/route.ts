import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import crypto from "node:crypto";

/**
 * GET /api/referrals/me
 *
 * Returns the calling user's referral code + redemption count. Issues a
 * new code if one doesn't exist yet (lazy bootstrap so we don't have to
 * backfill every existing user).
 */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const svc = createServiceClient();

  // Try to read an existing code.
  const { data: existing } = await svc
    .from("referral_codes")
    .select("code, created_at")
    .eq("user_id", user.id)
    .maybeSingle();

  let code = existing?.code as string | undefined;
  if (!code) {
    code = await issueUniqueCode(svc, user.id);
  }

  // Count redemptions for this user as the inviter.
  const { count } = await svc
    .from("referrals")
    .select("id", { count: "exact", head: true })
    .eq("inviter_user_id", user.id);

  return NextResponse.json({
    code,
    invitedCount: count ?? 0,
    inviteCap: 20,
    creditsPerRedemption: 5,
  });
}

/**
 * Generate an unguessable 8-character code, retrying on the (vanishingly
 * unlikely) collision. Charset excludes ambiguous chars (0/O, 1/I/l) so
 * the user can read it off the share sheet without typos.
 */
async function issueUniqueCode(
  svc: ReturnType<typeof createServiceClient>,
  userId: string,
): Promise<string> {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  for (let attempt = 0; attempt < 5; attempt++) {
    const bytes = crypto.randomBytes(8);
    const code = Array.from(bytes)
      .map((b) => alphabet[b % alphabet.length])
      .join("");
    const { error } = await svc.from("referral_codes").insert({
      user_id: userId,
      code,
    });
    if (!error) return code;
    if (!error.message?.toLowerCase().includes("duplicate")) throw error;
    // duplicate code (collision) — retry
  }
  throw new Error("could not issue unique referral code after 5 attempts");
}
