/**
 * Storage paths a clinic may hand to the server. The worker reads these
 * with the service role (which bypasses storage RLS), so a path must be
 * provably inside the owner's own folder: exact shape, no "..", no
 * encoded separators.
 *
 *   recording  <uid>/recordings/<Date.now()>.<ext>   (components/dentvid/record-upload.tsx)
 *   logo       <uid>/logo.<ext>                       (components/dentvid/clinic-form.tsx)
 */
const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const RECORDING = new RegExp(`^(${UUID})/recordings/\\d{10,16}\\.[a-z0-9_+-]{1,4}$`);
const LOGO = new RegExp(`^(${UUID})/logo\\.[a-z0-9_+-]{1,4}$`);

export function isOwnRecordingPath(path: string, userId: string): boolean {
  const m = RECORDING.exec(path);
  return !!m && m[1] === userId.toLowerCase();
}

export function isOwnLogoPath(path: string, userId: string): boolean {
  const m = LOGO.exec(path);
  return !!m && m[1] === userId.toLowerCase();
}
