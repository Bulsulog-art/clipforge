import { BUCKET, DV_SUPABASE_URL } from "./supabase";
import type { UploadKind } from "./storage-quota";

/**
 * Browser side of POST /api/dentvideo/upload-url: the server checks plan,
 * type, size and quota and hands back a one-time signed upload for a path
 * it chose. The file then goes straight to Liman storage.
 */

export type SignedUpload = { path: string; token: string; contentType: string };

export class UploadRefused extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly needsPlan: boolean,
  ) {
    super(message);
  }
}

/** The type a file is sent as: the browser's, else guessed from the name (some phones leave it empty). */
export function uploadType(kind: UploadKind, file: { name: string; type: string }): string {
  if (file.type) return file.type;
  const ext = (file.name.split(".").pop() ?? "").toLowerCase();
  if (kind === "logo") return ext === "jpg" || ext === "jpeg" ? "image/jpeg" : ext === "webp" ? "image/webp" : "image/png";
  return ext === "mov" ? "video/quicktime" : ext === "webm" ? "video/webm" : ext === "m4v" ? "video/x-m4v" : "video/mp4";
}

export async function requestUpload(kind: UploadKind, file: { name: string; size: number; type: string }, fallbackError: string): Promise<SignedUpload> {
  const res = await fetch("/api/dentvideo/upload-url", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ kind, name: file.name, size: file.size, contentType: uploadType(kind, file) }),
  });
  const body = (await res.json().catch(() => ({}))) as { path?: string; token?: string; contentType?: string; error?: string; needsPlan?: boolean };
  if (!res.ok || !body.path || !body.token) throw new UploadRefused(body.error ?? fallbackError, res.status, !!body.needsPlan);
  return { path: body.path, token: body.token, contentType: body.contentType ?? uploadType(kind, file) };
}

/** Storage's signed-upload endpoint for this path and token (PUT the file body). */
export function signedUploadEndpoint(path: string, token: string, base = DV_SUPABASE_URL): string {
  const p = path.split("/").map(encodeURIComponent).join("/");
  return `${base}/storage/v1/object/upload/sign/${BUCKET}/${p}?token=${encodeURIComponent(token)}`;
}
