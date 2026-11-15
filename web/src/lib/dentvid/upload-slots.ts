import { LOGO_MAX_BYTES, type UploadKind } from "./storage-quota";

/**
 * How many signed upload URLs an owner may hold at once (POST
 * /api/dentvideo/upload-url), per kind.
 *
 * A signed upload URL cannot carry a size: the size the browser declares is
 * checked, but the real file is bounded only by the bucket (500 MB, 0004).
 * The quota (storage-quota.ts) counts what is already stored, so before this
 * cap an unpaid account could ask for 30 logo URLs in a row (the per-user
 * rate limit), none of them used yet, and then PUT 500 MB through each:
 * ~15 GB per account per 10 minutes on the VPS disk the renders share.
 *
 * Now a URL takes a slot until its file is in storage (then the stored file
 * counts against the quota as usual) or until the URL has expired. Worst
 * case per account: the quota plus `MAX_PENDING_UPLOADS[kind]` files.
 *
 * The store is Redis (SET NX per slot, so concurrent requests cannot share a
 * slot). Without Redis the cap is skipped, like the rate limits (capacity
 * limits fail open; storage-cleanup still sweeps oversized logos).
 */
export const MAX_PENDING_UPLOADS: Record<UploadKind, number> = { logo: 2, recording: 3 };

/** Supabase signed upload URLs stay valid for 2 hours; a slot is held no longer than that. */
export const PENDING_UPLOAD_TTL_SEC = 2 * 60 * 60;

export interface SlotStore {
  get(key: string): Promise<string | null>;
  /** SET key value NX EX ttl — true when the key was created. */
  setNx(key: string, value: string, ttlSec: number): Promise<boolean>;
  del(key: string): Promise<void>;
}

const slotKey = (ownerId: string, kind: UploadKind, n: number) => `dv:upload:slot:${ownerId.toLowerCase()}:${kind}:${n}`;

/**
 * Take a slot for `path`. A slot whose file has arrived in storage
 * (`stored` holds the owner's object paths) is free again. False when every
 * slot holds a URL that has not been used yet.
 */
export async function claimUploadSlot(
  store: SlotStore,
  args: { ownerId: string; kind: UploadKind; path: string; stored: ReadonlySet<string>; max?: number; ttlSec?: number },
): Promise<boolean> {
  const max = args.max ?? MAX_PENDING_UPLOADS[args.kind];
  const ttl = args.ttlSec ?? PENDING_UPLOAD_TTL_SEC;
  for (let n = 0; n < max; n++) {
    const key = slotKey(args.ownerId, args.kind, n);
    const held = await store.get(key);
    if (held && args.stored.has(held)) await store.del(key);
    if (await store.setNx(key, args.path, ttl)) return true;
  }
  return false;
}

/** A versioned or legacy logo object in the owner's folder ("<uid>/logo-<ms>.png", "<uid>/logo.png"). */
const LOGO_NAME = /^[0-9a-f-]{36}\/logo(?:-\d{10,16})?\.[a-z0-9]{1,5}$/i;

/**
 * Logo objects that can never be a valid logo (larger than LOGO_MAX_BYTES —
 * POST /api/dentvideo/clinic refuses them) and are not the clinic's current
 * logo: safe to delete at once, whatever their age.
 */
export function oversizedLogos(files: readonly { path: string; size: number | null }[], currentLogo: string | null | undefined): string[] {
  return files.filter((f) => LOGO_NAME.test(f.path) && (f.size ?? 0) > LOGO_MAX_BYTES && f.path !== currentLogo).map((f) => f.path);
}

export class MemorySlotStore implements SlotStore {
  m = new Map<string, string>();
  async get(key: string) {
    return this.m.get(key) ?? null;
  }
  async setNx(key: string, value: string) {
    if (this.m.has(key)) return false;
    this.m.set(key, value);
    return true;
  }
  async del(key: string) {
    this.m.delete(key);
  }
}
