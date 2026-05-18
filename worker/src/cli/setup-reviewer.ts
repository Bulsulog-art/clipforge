#!/usr/bin/env tsx
/**
 * One-shot setup for the Apple App Review test account.
 *
 * Creates (or upserts) the reviewer auth.users row with a known password,
 * grants Plus entitlement bypass via tier='starter' on the profile, seeds 5
 * credits so the reviewer can exercise every feature.
 *
 * Usage:
 *   pnpm tsx src/cli/setup-reviewer.ts <email> <password>
 *
 * Output: prints back the credentials + user id. Save them into App Store
 * Connect → App Review → Sign-In Information.
 */
import { supabase } from "../supabase.js";

async function main() {
  const [email, password] = process.argv.slice(2);
  if (!email || !password) {
    console.error("Usage: setup-reviewer <email> <password>");
    process.exit(1);
  }

  // Look for existing reviewer
  const { data: list } = await supabase.auth.admin.listUsers({ page: 1, perPage: 200 });
  const existing = list?.users?.find((u: { email?: string }) => u.email === email);

  let userId: string;
  if (existing) {
    console.log("ℹ existing reviewer found — updating password + profile");
    const { error } = await supabase.auth.admin.updateUserById(existing.id, {
      password,
      email_confirm: true,
    });
    if (error) throw error;
    userId = existing.id;
  } else {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { role: "apple_reviewer" },
    });
    if (error || !data?.user) throw error ?? new Error("createUser returned no user");
    userId = data.user.id;
    console.log("✓ created reviewer auth user", userId);
  }

  // Upsert profile with starter tier so all paid features unlock for review.
  // The handle_new_user trigger may have already inserted a row — we patch it.
  const { error: profErr } = await supabase
    .from("profiles")
    .update({
      tier: "starter",
      credits_balance: 5,
      watermark_enabled: false,
    })
    .eq("id", userId);
  if (profErr) {
    // If the row doesn't exist yet (rare — trigger should have fired), insert it.
    const { error: insErr } = await supabase.from("profiles").insert({
      id: userId,
      tier: "starter",
      credits_balance: 5,
      watermark_enabled: false,
    });
    if (insErr) throw insErr;
  }

  // Log a credit event for auditing (so the reviewer's balance has a paper trail)
  await supabase.from("credit_events").insert({
    user_id: userId,
    delta: 5,
    kind: "admin_grant",
    reason: "apple_reviewer_setup",
    reference: "setup-reviewer-cli",
  });

  console.log("\n══════════════════════════════════════════════════════════════");
  console.log("Apple App Review credentials — paste into ASC App Review tab");
  console.log("══════════════════════════════════════════════════════════════");
  console.log(`  email:    ${email}`);
  console.log(`  password: ${password}`);
  console.log(`  user_id:  ${userId}`);
  console.log(`  tier:     starter (Plus unlocked, watermark off)`);
  console.log(`  credits:  5 (covers full feature audit)`);
  console.log("══════════════════════════════════════════════════════════════\n");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
