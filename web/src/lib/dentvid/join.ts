import { dvAdmin } from "./supabase";
import { joinDentvideoPatch } from "./membership";

/**
 * Add DentVideo to an existing Liman account (lib/dentvid/membership
 * joinDentvideoPatch). Call only after the person proved the account is
 * theirs. True when the account is (now) a DentVideo account.
 */
export async function joinDentvideo(userId: string): Promise<boolean> {
  try {
    const admin = dvAdmin();
    const { data, error } = await admin.auth.admin.getUserById(userId);
    if (error || !data?.user) return false;
    const patch = joinDentvideoPatch(data.user.app_metadata);
    if (!patch) return true;
    const { error: ue } = await admin.auth.admin.updateUserById(userId, { app_metadata: patch });
    if (ue) {
      console.error("[dentvideo join] could not add DentVideo to the account", ue.message);
      return false;
    }
    return true;
  } catch (e) {
    console.error("[dentvideo join] failed", (e as Error).message);
    return false;
  }
}
