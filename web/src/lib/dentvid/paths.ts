/**
 * Storage paths a clinic may hand to the server. The worker reads these
 * with the service role (which bypasses storage RLS), so a path must be
 * provably inside the owner's own folder: exact shape, no "..", no
 * encoded separators.
 *
 *   recording  <uid>/recordings/<Date.now()>.<ext>   (components/dentvid/record-upload.tsx)
 *   logo       <uid>/logo-<Date.now()>.<ext>          (components/dentvid/clinic-form.tsx)
 *
 * Logos are versioned: a new one gets a new name, so replacing a logo never
 * needs an overwrite (the bucket has no UPDATE policy), and the previous
 * file is deleted by the server once the new path is saved
 * (app/api/dentvideo/clinic). The pre-0008 fixed name `<uid>/logo.<ext>` is
 * still accepted, so clinics that saved one keep it.
 *
 * The same shapes are enforced in the database: migration 0008
 * (dentvid_clinics_guard_paths and the storage insert policy).
 */
const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const RECORDING = new RegExp(`^(${UUID})/recordings/\\d{10,16}\\.[a-z0-9_+-]{1,4}$`);
const LOGO = new RegExp(`^(${UUID})/logo(?:-\\d{10,16})?\\.[a-z0-9_+-]{1,4}$`);

/** File extensions a logo may have (the bucket's image MIME allow-list from 0004). */
export const LOGO_EXTS = ["png", "jpg", "jpeg", "webp"] as const;
/** File extensions a recording may have (the bucket's video MIME allow-list from 0004). */
export const RECORDING_EXTS = ["mp4", "mov", "webm", "m4v"] as const;

export function isOwnRecordingPath(path: string, userId: string): boolean {
  const m = RECORDING.exec(path);
  return !!m && m[1] === userId.toLowerCase();
}

export function isOwnLogoPath(path: string, userId: string): boolean {
  const m = LOGO.exec(path);
  return !!m && m[1] === userId.toLowerCase();
}

/** "Logo.PNG" → "png"; null when it is not an allowed type. */
export function fileExt(name: string, allowed: readonly string[]): string | null {
  const ext = (name.split(".").pop() ?? "").toLowerCase();
  return allowed.includes(ext) ? ext : null;
}

export function logoPathFor(userId: string, ext: string, now = Date.now()): string {
  return `${userId.toLowerCase()}/logo-${now}.${ext}`;
}

export function recordingPathFor(userId: string, ext: string, now = Date.now()): string {
  return `${userId.toLowerCase()}/recordings/${now}.${ext}`;
}
