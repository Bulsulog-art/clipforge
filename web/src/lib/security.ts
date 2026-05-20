import { timingSafeEqual } from "node:crypto";

// Shared security primitives so the API routes can use them and the
// vitest suite can test them independently of Next's request plumbing.

export const ALLOWED_SOURCE_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "music.youtube.com",
  "youtu.be",
  "tiktok.com",
  "www.tiktok.com",
  "m.tiktok.com",
  "vm.tiktok.com",
  "vt.tiktok.com",
]);

export function isAllowedSourceUrl(u: string): boolean {
  try {
    const parsed = new URL(u);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return false;
    return ALLOWED_SOURCE_HOSTS.has(parsed.hostname.toLowerCase());
  } catch {
    return false;
  }
}

export function isOwnedPath(path: string | null | undefined, userId: string): boolean {
  if (!path) return true; // optional field — empty is OK
  if (path.includes("..")) return false;
  return path.startsWith(`${userId}/`);
}

export function bearerEquals(headerValue: string | null, secret: string | undefined): boolean {
  if (!secret || !headerValue) return false;
  const expected = `Bearer ${secret}`;
  const a = Buffer.from(headerValue);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
