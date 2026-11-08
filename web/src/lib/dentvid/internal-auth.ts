import { timingSafeEqual } from "node:crypto";

/** Worker → web calls: "Bearer <WORKER_INTERNAL_TOKEN>", compared in constant time. */
export function workerAuthorised(header: string | null, env: Record<string, string | undefined> = process.env): boolean {
  const expected = env.WORKER_INTERNAL_TOKEN;
  const got = (header ?? "").replace(/^Bearer\s+/i, "");
  if (!expected || !got) return false;
  const a = Buffer.from(got);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
