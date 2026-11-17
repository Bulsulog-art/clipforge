import type { DvPlanState, DvTier } from "./billing";

/**
 * What a clinic may put into its storage folder ("dentvid" bucket on Liman),
 * decided before the server signs an upload URL
 * (POST /api/dentvideo/upload-url). Migration 0008 enforces the same rules
 * in the storage insert policy for direct uploads (keep the numbers equal:
 * dentvid_storage_within_quota / dentvid_can_record).
 *
 *   logo       any DentVideo account (the sign-up wizard asks for one before
 *              payment); image types only, ≤ 5 MB
 *   recording  only an active clinic on a plan with recordings (Practice /
 *              Group — the Starter plan has none, as on the pricing page)
 *
 * Per-owner quota, counted over everything in "<uid>/" (the worker's
 * rendered videos too):
 *   not paying  20 files, 50 MB    (logos only; enough for many replacements)
 *   active      3000 files, 25 GB  (≈ 5 years of weekly videos plus recordings)
 * One upload can overshoot the byte quota by at most its own size (the size
 * a browser declares is checked, the real size is bounded by the bucket's
 * 500 MB limit from 0004 and re-checked when the recording is queued).
 *
 * Pure: the caller loads the plan and the usage.
 */

export const LOGO_MAX_BYTES = 5 * 1024 * 1024;
export const RECORDING_MAX_BYTES = 500 * 1024 * 1024;

export const STORAGE_QUOTA = {
  unpaid: { files: 20, bytes: 50 * 1024 * 1024 },
  active: { files: 3000, bytes: 25 * 1024 * 1024 * 1024 },
} as const;

export const LOGO_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;
export const RECORDING_TYPES = ["video/mp4", "video/quicktime", "video/webm", "video/x-m4v"] as const;

export type UploadKind = "logo" | "recording";
export type Usage = { files: number; bytes: number };

export function canRecord(plan: DvPlanState | string | null | undefined, tier: DvTier | string | null | undefined): boolean {
  return plan === "active" && tier !== "starter";
}

export function quotaFor(plan: DvPlanState | string | null | undefined) {
  return plan === "active" ? STORAGE_QUOTA.active : STORAGE_QUOTA.unpaid;
}

export type UploadDecision = { ok: true } | { ok: false; reason: "plan" | "type" | "size" | "quota" };

export function decideUpload(args: {
  kind: UploadKind;
  plan: DvPlanState | string | null | undefined;
  tier: DvTier | string | null | undefined;
  usage: Usage;
  size: number;
  contentType: string;
}): UploadDecision {
  const { kind, usage, size } = args;
  const type = args.contentType.toLowerCase();
  if (kind === "recording" && !canRecord(args.plan, args.tier)) return { ok: false, reason: "plan" };
  const types: readonly string[] = kind === "logo" ? LOGO_TYPES : RECORDING_TYPES;
  if (!types.includes(type)) return { ok: false, reason: "type" };
  const max = kind === "logo" ? LOGO_MAX_BYTES : RECORDING_MAX_BYTES;
  if (!Number.isFinite(size) || size <= 0 || size > max) return { ok: false, reason: "size" };
  const q = quotaFor(args.plan);
  if (usage.files + 1 > q.files || usage.bytes + size > q.bytes) return { ok: false, reason: "quota" };
  return { ok: true };
}

/** The extension to store a file under, from its name, else its type. */
export function extFor(kind: UploadKind, name: string | undefined, contentType: string): string {
  const fromName = (name?.split(".").pop() ?? "").toLowerCase();
  if (kind === "logo") {
    if (["png", "jpg", "jpeg", "webp"].includes(fromName)) return fromName;
    return contentType === "image/jpeg" ? "jpg" : contentType === "image/webp" ? "webp" : "png";
  }
  if (["mp4", "mov", "webm", "m4v"].includes(fromName)) return fromName;
  return contentType === "video/quicktime" ? "mov" : contentType === "video/webm" ? "webm" : contentType === "video/x-m4v" ? "m4v" : "mp4";
}
