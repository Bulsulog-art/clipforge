import { lookup } from "node:dns/promises";
import { request as httpsRequest } from "node:https";
import { isIP } from "node:net";

/**
 * Fetch one image from a URL the owner pasted (a clinic's logo on its own
 * website), ONCE, server side, so the demo keeps its own copy and never
 * hotlinks. Built against SSRF:
 *
 * - https only, default port, no credentials in the URL;
 * - the host name is resolved here and EVERY address must be public —
 *   loopback, RFC 1918, CGNAT, link-local (169.254.0.0/16, the cloud
 *   metadata address), multicast, reserved, unique-local and mapped
 *   IPv4-in-IPv6 forms are refused;
 * - the connection goes to the address that was checked (the socket's DNS
 *   lookup is pinned to it), so a second, different DNS answer cannot slip
 *   a private address in between check and connect (DNS rebinding);
 * - redirects are followed by hand, at most 3, each hop checked the same way;
 * - 5 s for the whole thing, 2 MB at most (declared length and bytes read),
 *   and only PNG, JPEG or WebP — by content-type AND by the file's own
 *   magic bytes (no SVG: it can carry script).
 *
 * The resolver and the transport are injectable for tests.
 */

export class ImageFetchError extends Error {
  constructor(
    public code: "url" | "blocked" | "dns" | "status" | "type" | "size" | "timeout" | "redirects" | "network",
    message: string,
  ) {
    super(message);
  }
}

export type FetchedImage = { bytes: Uint8Array; contentType: "image/png" | "image/jpeg" | "image/webp"; ext: "png" | "jpg" | "webp" };

export type TransportResponse = { status: number; headers: Record<string, string | undefined>; body: AsyncIterable<Uint8Array>; cancel(): void };
/** Open `url`, connecting to `ip` (already checked) with SNI / Host for the URL's host name. */
export type Transport = (url: URL, ip: string, signal: AbortSignal) => Promise<TransportResponse>;
export type Resolver = (host: string) => Promise<string[]>;

export const IMAGE_FETCH_MAX_BYTES = 2 * 1024 * 1024;
export const IMAGE_FETCH_TIMEOUT_MS = 5000;
const MAX_REDIRECTS = 3;

/* ---------------------------------------------------------------- addresses */

function v4ToInt(ip: string): number {
  return ip.split(".").reduce((n, p) => ((n << 8) | Number(p)) >>> 0, 0);
}

const V4_BLOCKED: [string, number][] = [
  ["0.0.0.0", 8], // "this network"
  ["10.0.0.0", 8], // RFC 1918
  ["100.64.0.0", 10], // CGNAT
  ["127.0.0.0", 8], // loopback
  ["169.254.0.0", 16], // link-local, cloud metadata (169.254.169.254)
  ["172.16.0.0", 12], // RFC 1918
  ["192.0.0.0", 24], // IETF protocol assignments
  ["192.0.2.0", 24], // TEST-NET-1
  ["192.88.99.0", 24], // 6to4 relay
  ["192.168.0.0", 16], // RFC 1918
  ["198.18.0.0", 15], // benchmarking
  ["198.51.100.0", 24], // TEST-NET-2
  ["203.0.113.0", 24], // TEST-NET-3
  ["224.0.0.0", 4], // multicast
  ["240.0.0.0", 4], // reserved, broadcast
];

function blockedV4(ip: string): boolean {
  const n = v4ToInt(ip);
  return V4_BLOCKED.some(([base, bits]) => {
    const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
    return (n & mask) === (v4ToInt(base) & mask);
  });
}

/** Expand an IPv6 address to 8 groups of 16 bits (handles "::" and a dotted IPv4 tail). */
function v6Groups(ip: string): number[] | null {
  let s = ip.toLowerCase().split("%")[0];
  const v4 = /(\d+\.\d+\.\d+\.\d+)$/.exec(s);
  if (v4) {
    const n = v4ToInt(v4[1]);
    s = s.slice(0, -v4[1].length) + `${(n >>> 16).toString(16)}:${(n & 0xffff).toString(16)}`;
  }
  const [head, tail] = s.split("::");
  const h = head ? head.split(":") : [];
  const t = tail !== undefined ? (tail ? tail.split(":") : []) : [];
  const fill = s.includes("::") ? 8 - h.length - t.length : 0;
  const all = [...h, ...Array(fill).fill("0"), ...t].map((g) => parseInt(g || "0", 16));
  return all.length === 8 && all.every((g) => Number.isInteger(g) && g >= 0 && g <= 0xffff) ? all : null;
}

function blockedV6(ip: string): boolean {
  const g = v6Groups(ip);
  if (!g) return true;
  const embeddedV4 = () => `${g[6] >> 8}.${g[6] & 0xff}.${g[7] >> 8}.${g[7] & 0xff}`;
  if (g.every((x) => x === 0)) return true; // ::
  if (g.slice(0, 7).every((x) => x === 0) && g[7] === 1) return true; // ::1
  if (g.slice(0, 5).every((x) => x === 0) && g[5] === 0xffff) return blockedV4(embeddedV4()); // ::ffff:a.b.c.d
  if (g.slice(0, 6).every((x) => x === 0)) return true; // ::a.b.c.d (deprecated compatible)
  if (g[0] === 0x64 && g[1] === 0xff9b) return blockedV4(embeddedV4()); // NAT64
  if ((g[0] & 0xfe00) === 0xfc00) return true; // fc00::/7 unique local
  if ((g[0] & 0xffc0) === 0xfe80) return true; // fe80::/10 link-local
  if ((g[0] & 0xffc0) === 0xfec0) return true; // fec0::/10 site-local (deprecated)
  if ((g[0] & 0xff00) === 0xff00) return true; // multicast
  if (g[0] === 0x2001 && g[1] === 0x0db8) return true; // documentation
  if (g[0] === 0x0100 && g[1] === 0 && g[2] === 0 && g[3] === 0) return true; // discard-only
  if (g[0] === 0x2002) return true; // 6to4 (embeds arbitrary IPv4)
  if (g[0] === 0x2001 && g[1] === 0) return true; // Teredo
  return false;
}

/** True when an address must never be fetched from the server. Anything unparseable counts as blocked. */
export function isBlockedAddress(ip: string): boolean {
  const kind = isIP(ip.split("%")[0]);
  if (kind === 4) return blockedV4(ip);
  if (kind === 6) return blockedV6(ip);
  return true;
}

/* -------------------------------------------------------------------- URL */

export function checkImageUrl(raw: string): URL {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    throw new ImageFetchError("url", "Not a valid URL.");
  }
  if (u.protocol !== "https:") throw new ImageFetchError("url", "Only https:// URLs are fetched.");
  if (u.username || u.password) throw new ImageFetchError("url", "URLs with credentials are not fetched.");
  if (u.port && u.port !== "443") throw new ImageFetchError("url", "Only the default https port is fetched.");
  const host = u.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (!host || host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal")) {
    throw new ImageFetchError("blocked", "That host is not reachable from here.");
  }
  if (isIP(host) && isBlockedAddress(host)) throw new ImageFetchError("blocked", "That address is private.");
  return u;
}

/* --------------------------------------------------------------- defaults */

const systemResolver: Resolver = async (host) => {
  if (isIP(host)) return [host];
  const all = await lookup(host, { all: true, verbatim: true });
  return all.map((a) => a.address);
};

const httpsTransport: Transport = (url, ip, signal) =>
  new Promise((resolve, reject) => {
    const req = httpsRequest(
      {
        protocol: "https:",
        hostname: url.hostname.replace(/^\[|\]$/g, ""),
        servername: isIP(url.hostname.replace(/^\[|\]$/g, "")) ? undefined : url.hostname,
        port: 443,
        path: `${url.pathname}${url.search}`,
        method: "GET",
        headers: { "user-agent": "DentVideo-LogoFetch/1.0", accept: "image/png,image/jpeg,image/webp" },
        // Pin the socket to the checked address: no second DNS answer.
        lookup: ((_h: string, opts: { all?: boolean }, cb: (...a: unknown[]) => void) => {
          const family = isIP(ip);
          if (opts?.all) cb(null, [{ address: ip, family }]);
          else cb(null, ip, family);
        }) as never,
        signal,
        agent: false,
      },
      (res) => {
        const headers: Record<string, string | undefined> = {};
        for (const [k, v] of Object.entries(res.headers)) headers[k.toLowerCase()] = Array.isArray(v) ? v[0] : v;
        resolve({ status: res.statusCode ?? 0, headers, body: res as AsyncIterable<Uint8Array>, cancel: () => res.destroy() });
      },
    );
    req.on("error", reject);
    req.end();
  });

/* ------------------------------------------------------------------ types */

const TYPES: Record<string, FetchedImage["contentType"]> = { "image/png": "image/png", "image/jpeg": "image/jpeg", "image/jpg": "image/jpeg", "image/webp": "image/webp" };

/** The image type from the file's first bytes, or null. */
export function sniffImage(b: Uint8Array): FetchedImage["contentType"] | null {
  if (b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 && b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a) return "image/png";
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b.length >= 12 && b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return "image/webp";
  return null;
}

export const EXT_OF: Record<FetchedImage["contentType"], FetchedImage["ext"]> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };

/** Checked bytes of an uploaded or fetched image: the declared type (if any) must agree with the file itself. */
export function checkImageBytes(bytes: Uint8Array, declared?: string | null, max = IMAGE_FETCH_MAX_BYTES): FetchedImage {
  if (bytes.byteLength === 0) throw new ImageFetchError("type", "The file is empty.");
  if (bytes.byteLength > max) throw new ImageFetchError("size", "The image is larger than 2 MB.");
  const sniffed = sniffImage(bytes);
  if (!sniffed) throw new ImageFetchError("type", "Only PNG, JPEG or WebP images are accepted.");
  if (declared) {
    const d = TYPES[declared.split(";")[0].trim().toLowerCase()];
    if (!d || d !== sniffed) throw new ImageFetchError("type", "The file is not the image type it claims to be.");
  }
  return { bytes, contentType: sniffed, ext: EXT_OF[sniffed] };
}

/* ------------------------------------------------------------------ fetch */

export async function fetchImageSafely(
  raw: string,
  opts: { resolve?: Resolver; transport?: Transport; timeoutMs?: number; maxBytes?: number } = {},
): Promise<FetchedImage> {
  const resolve = opts.resolve ?? systemResolver;
  const transport = opts.transport ?? httpsTransport;
  const max = opts.maxBytes ?? IMAGE_FETCH_MAX_BYTES;
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), opts.timeoutMs ?? IMAGE_FETCH_TIMEOUT_MS);
  const timedOut = () => ctl.signal.aborted;
  try {
    let url = checkImageUrl(raw);
    for (let hop = 0; ; hop++) {
      const host = url.hostname.replace(/^\[|\]$/g, "");
      let addrs: string[];
      try {
        addrs = await Promise.race([
          resolve(host),
          new Promise<never>((_, rej) => ctl.signal.addEventListener("abort", () => rej(new ImageFetchError("timeout", "Timed out.")), { once: true })),
        ]);
      } catch (e) {
        if (e instanceof ImageFetchError) throw e;
        throw new ImageFetchError("dns", "The host name does not resolve.");
      }
      if (!addrs.length) throw new ImageFetchError("dns", "The host name does not resolve.");
      // Every answer must be public: a mixed answer is how rebinding attacks start.
      if (addrs.some(isBlockedAddress)) throw new ImageFetchError("blocked", "That host points to a private address.");

      let res: TransportResponse;
      try {
        res = await transport(url, addrs[0], ctl.signal);
      } catch (e) {
        if (timedOut()) throw new ImageFetchError("timeout", "Timed out.");
        throw new ImageFetchError("network", `Could not fetch the image (${(e as Error).message}).`);
      }

      if (res.status >= 300 && res.status < 400) {
        res.cancel();
        const loc = res.headers.location;
        if (!loc) throw new ImageFetchError("status", "Redirect without a location.");
        if (hop >= MAX_REDIRECTS) throw new ImageFetchError("redirects", "Too many redirects.");
        url = checkImageUrl(new URL(loc, url).toString());
        continue;
      }
      if (res.status !== 200) {
        res.cancel();
        throw new ImageFetchError("status", `The server answered ${res.status}.`);
      }
      const type = (res.headers["content-type"] ?? "").split(";")[0].trim().toLowerCase();
      if (!TYPES[type]) {
        res.cancel();
        throw new ImageFetchError("type", "That URL is not a PNG, JPEG or WebP image.");
      }
      const declared = Number(res.headers["content-length"] ?? "0");
      if (declared > max) {
        res.cancel();
        throw new ImageFetchError("size", "The image is larger than 2 MB.");
      }
      const chunks: Uint8Array[] = [];
      let size = 0;
      try {
        for await (const chunk of res.body) {
          size += chunk.byteLength;
          if (size > max) {
            res.cancel();
            throw new ImageFetchError("size", "The image is larger than 2 MB.");
          }
          chunks.push(chunk);
        }
      } catch (e) {
        if (e instanceof ImageFetchError) throw e;
        if (timedOut()) throw new ImageFetchError("timeout", "Timed out.");
        throw new ImageFetchError("network", "The download was cut off.");
      }
      if (timedOut()) throw new ImageFetchError("timeout", "Timed out.");
      const bytes = new Uint8Array(size);
      let at = 0;
      for (const c of chunks) {
        bytes.set(c, at);
        at += c.byteLength;
      }
      return checkImageBytes(bytes, type, max);
    }
  } finally {
    clearTimeout(timer);
  }
}
