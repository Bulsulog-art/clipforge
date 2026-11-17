import { createClient } from "@supabase/supabase-js";
import { kvStore } from "@/lib/rate-limit-server";
import { sendEmail } from "./email";
import { DV_SUPABASE_ANON, DV_SUPABASE_URL, dvAdmin } from "./supabase";
import { codeEmail } from "./verify-email-message";
import { isDentvideoUser } from "./membership";
import { joinDentvideo } from "./join";
import { isMonitorEmail } from "./monitor-account";
import { isEmailVerified, issueCode, verifiedAppMetadata, verifySecret, type IssueResult, type VerifyKv, type VerifyMethod } from "./verify-email";

/**
 * Server wiring for lib/dentvid/verify-email: Redis for the code, Resend for
 * the email, the admin API for the verified flag (app_metadata).
 */

export type SendCodeResult = { ok: true } | { ok: false; reason: "cooldown"; retryAfterSec: number } | { ok: false; reason: "pending" | "unavailable" | "not sent" };

export async function sendVerificationCode(args: {
  userId: string;
  email: string;
  language: string;
  onlyIfNone?: boolean;
  ignoreCooldown?: boolean;
  kv?: VerifyKv;
  send?: typeof sendEmail;
}): Promise<SendCodeResult> {
  // Synthetic-monitor and smoke-test accounts (lib/dentvid/monitor-account) never get mail.
  if (isMonitorEmail(args.email)) return { ok: true };
  const secret = verifySecret();
  if (!secret) return { ok: false, reason: "unavailable" };
  let issued: IssueResult;
  try {
    issued = await issueCode(args.kv ?? kvStore(), {
      userId: args.userId,
      email: args.email,
      secret,
      onlyIfNone: args.onlyIfNone,
      ignoreCooldown: args.ignoreCooldown,
    });
  } catch (e) {
    console.error("[dentvideo verify] code store unavailable", (e as Error).message);
    return { ok: false, reason: "unavailable" };
  }
  if (!issued.ok) return issued;
  const sent = await (args.send ?? sendEmail)(args.email, codeEmail({ language: args.language, code: issued.code }));
  if (!sent) {
    console.error("[dentvideo verify] code email not sent");
    return { ok: false, reason: "not sent" };
  }
  return { ok: true };
}

export type ExchangeDeps = {
  verify: (tokenHash: string) => Promise<{
    session: { access_token: string; refresh_token: string } | null;
    user: { id: string; email?: string | null; app_metadata?: Record<string, unknown> } | null;
  }>;
  markVerified: (userId: string, email: string, method: VerifyMethod) => Promise<boolean>;
  /** End every other session of this user (the access token's own stays). */
  signOutOthers: (accessToken: string) => Promise<void>;
  /** Add DentVideo to an account another app made with this address (lib/dentvid/join). */
  join: (userId: string) => Promise<boolean>;
};

const exchangeDeps: ExchangeDeps = {
  async verify(tokenHash) {
    const anon = createClient(DV_SUPABASE_URL, DV_SUPABASE_ANON, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await anon.auth.verifyOtp({ token_hash: tokenHash, type: "recovery" });
    if (error) return { session: null, user: null };
    return { session: data.session, user: data.user };
  },
  markVerified: (userId, email, method) => markEmailVerified(userId, email, method),
  async signOutOthers(accessToken) {
    const { error } = await dvAdmin().auth.admin.signOut(accessToken, "others");
    if (error) console.error("[dentvideo reset] could not end other sessions", error.message);
  },
  join: (userId) => joinDentvideo(userId),
};

/**
 * Exchange a password-reset token for a session. A successful exchange means
 * the person opened mail sent to the account's address, so it also marks the
 * address verified. Null when the token is invalid or used.
 *
 * Reclaiming a squatted address: someone may have signed up with another
 * person's address (accounts start unverified). The real owner resets the
 * password from the mailbox; when the account was unverified until now,
 * every other session (the squatter's) is ended here, and the new password
 * set on /reset keeps them out.
 */
export async function exchangeRecovery(tokenHash: string, deps: ExchangeDeps = exchangeDeps) {
  const { session, user } = await deps.verify(tokenHash);
  if (!session || !user) return null;
  // The link was opened from this address's mailbox: an account another app
  // made with it may now use DentVideo too.
  if (!isDentvideoUser(user)) await deps.join(user.id);
  let verified = isEmailVerified(user);
  if (!verified && user.email) {
    verified = await deps.markVerified(user.id, user.email, "reset");
    await deps.signOutOthers(session.access_token).catch(() => {});
  }
  return { access_token: session.access_token, refresh_token: session.refresh_token, verified };
}

/** Record proven ownership of `email` on the auth user. False when the admin API refuses. */
export async function markEmailVerified(userId: string, email: string, method: VerifyMethod): Promise<boolean> {
  try {
    const admin = dvAdmin();
    const { data, error: readError } = await admin.auth.admin.getUserById(userId);
    if (readError || !data?.user) return false;
    // Only for the address the account has now (a change since the code was sent does not count).
    if ((data.user.email ?? "").toLowerCase() !== email.toLowerCase()) return false;
    // app_metadata: only the service role can write it (user_metadata is the user's own to edit).
    const { error } = await admin.auth.admin.updateUserById(userId, { app_metadata: verifiedAppMetadata(email, method) });
    if (error) {
      console.error("[dentvideo verify] could not mark verified", error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.error("[dentvideo verify] could not mark verified", (e as Error).message);
    return false;
  }
}
