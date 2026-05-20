#!/usr/bin/env tsx
/**
 * One-shot setup for the Apple App Review test account.
 *
 * Creates (or upserts) the reviewer auth.users row with a known password,
 * grants Plus entitlement bypass via tier='starter' on the profile, seeds 5
 * credits so the reviewer can exercise every feature.
 *
 * Usage:
 *   REVIEWER_EMAIL=… REVIEWER_PASSWORD=… pnpm tsx src/cli/setup-reviewer.ts
 *
 * Password from env (not argv) so it doesn't show up in `ps auxf` or
 * shell history. Output prints back the credentials + user id once —
 * paste them into App Store Connect → App Review → Sign-In Information.
 */
import { supabase } from "../supabase.js";

async function main() {
  // Accept --email arg or REVIEWER_EMAIL env. Password is env-only on purpose.
  const argEmail = process.argv.slice(2).find((a) => !a.startsWith("-"));
  const email = process.env.REVIEWER_EMAIL ?? argEmail;
  const password = process.env.REVIEWER_PASSWORD;
  if (!email || !password) {
    console.error(
      "Usage: REVIEWER_EMAIL=review@example.com REVIEWER_PASSWORD=secret pnpm tsx src/cli/setup-reviewer.ts",
    );
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
  console.log("Apple App Review setup complete — paste into ASC App Review tab");
  console.log("══════════════════════════════════════════════════════════════");
  console.log(`  email:    ${email}`);
  console.log(`  password: (from REVIEWER_PASSWORD env — not echoed)`);
  console.log(`  user_id:  ${userId}`);
  console.log(`  tier:     starter (Plus unlocked, watermark off)`);
  console.log(`  credits:  5 (covers full feature audit)`);
  console.log("══════════════════════════════════════════════════════════════\n");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
