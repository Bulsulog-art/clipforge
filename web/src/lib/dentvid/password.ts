/**
 * Password rules Liman (GoTrue) enforces, so the forms can say them plainly.
 *
 * GoTrue hashes with bcrypt and refuses a password over 72 bytes ("Password
 * cannot be longer than 72 characters"). Without this check a long password
 * from a password manager or a passphrase got "Could not create the account"
 * at sign-up (and woke the owner), and "this link has expired" on /reset.
 * Bytes, not characters: an accented letter is two bytes, a Japanese one three.
 */
export const MIN_PASSWORD_CHARS = 8;
export const MAX_PASSWORD_BYTES = 72;

export function passwordBytes(password: string): number {
  return new TextEncoder().encode(password).length;
}

export function passwordTooLong(password: string): boolean {
  return passwordBytes(password) > MAX_PASSWORD_BYTES;
}

/**
 * /reset: what an error from updateUser({ password }) means for the clinic.
 *
 *   same_password    they chose the password they already had: it is theirs
 *                    and they are signed in, so carry on (Liman refuses it
 *                    with 422; this used to read "the link has expired")
 *   too long         the 72-byte limit (checked before sending, kept as a net)
 *   anything else    the recovery session is gone: ask for a new link
 */
export function resetSaveOutcome(err: { code?: string | null; message?: string | null } | null | undefined): "saved" | "tooLong" | "invalid" {
  if (!err) return "saved";
  if (err.code === "same_password" || /different from the old password/i.test(err.message ?? "")) return "saved";
  if (/longer than 72/i.test(err.message ?? "")) return "tooLong";
  return "invalid";
}
