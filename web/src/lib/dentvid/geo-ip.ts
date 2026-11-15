/**
 * The visitor's country, worked out on our own server from the connecting IP
 * address: no third-party call, no cookie, and the IP is never logged, stored
 * or returned — only the ISO country code leaves this module.
 *
 * Server-only (reads a file). The browser asks /api/dentvideo/geo.
 *
 * Country database: DB-IP "IP to Country Lite" (CC BY 4.0, attribution on the
 * privacy page), downloaded into the image at build time by
 * scripts/fetch-geoip.mjs (web/Dockerfile) and read in-process with mmdb-lib.
 * If the file is missing (a failed download, a dev machine without it) every
 * lookup is null — the same as before this module existed: the price shows
 * by time zone, and the ad-click prompt asks first.
 *
 * Which header carries the client IP — see clientIpForGeo below.
 *
 * Edge country headers (CF-IPCountry, X-Vercel-IP-Country, X-Country-Code)
 * are IGNORED unless DENTVID_TRUST_EDGE_COUNTRY=1: production runs behind
 * Traefik with no CDN in front, so such a header can only have come from the
 * client itself (sending "CF-IPCountry: TR" would skip the EU consent prompt).
 * Set the flag only once a CDN that sets (and overwrites) one of them sits in
 * front and the origin accepts traffic from that CDN only.
 */

import fs from "node:fs";
import { isIP } from "node:net";
import path from "node:path";
import { Reader } from "mmdb-lib";

type Env = Record<string, string | undefined>;
type Headers = { get(name: string): string | null };

/** A country database: the part of mmdb-lib's Reader we use (tests pass a fake). */
export type CountryReader = { get(ip: string): unknown };

/** Where the Dockerfile puts the database (the standalone server runs in /app). DENTVID_GEOIP_DB overrides it. */
export const GEOIP_DB_FILE = "geoip/dbip-country-lite.mmdb";

const COUNTRY = /^[A-Z]{2}$/;

/** An ISO 3166 alpha-2 code, or undefined for anything else (and for XX unknown / T1 Tor / EU / AP placeholders). */
function isoCountry(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  const c = v.trim().toUpperCase();
  return COUNTRY.test(c) && c !== "XX" && c !== "T1" && c !== "EU" && c !== "AP" && c !== "ZZ" ? c : undefined;
}

/**
 * The country a CDN in front of us reported (Cloudflare's CF-IPCountry,
 * Vercel's x-vercel-ip-country, a generic x-country-code). Only read when
 * DENTVID_TRUST_EDGE_COUNTRY=1 — without such an edge these headers are
 * whatever the client typed.
 */
export function edgeCountry(headers: Headers): string | undefined {
  for (const h of ["cf-ipcountry", "x-vercel-ip-country", "x-country-code"]) {
    const c = isoCountry(headers.get(h));
    if (c) return c;
  }
  return undefined;
}

/** "203.0.113.9", "203.0.113.9:4711", "[2001:db8::1]:443", "::ffff:203.0.113.9" → a bare address, or null. */
export function normaliseIp(raw: string | null | undefined): string | null {
  let s = (raw ?? "").trim();
  if (!s) return null;
  const bracket = /^\[([^\]]+)\](?::\d+)?$/.exec(s);
  if (bracket) s = bracket[1];
  else if (/^\d{1,3}(?:\.\d{1,3}){3}:\d+$/.test(s)) s = s.slice(0, s.lastIndexOf(":"));
  s = s.replace(/%.*$/, ""); // IPv6 zone id
  const mapped = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i.exec(s);
  if (mapped) s = mapped[1];
  return isIP(s) ? s : null;
}

/**
 * The client's address as our reverse proxy (Coolify's Traefik) saw the TCP
 * connection — the one value a client cannot choose.
 *
 * The LAST X-Forwarded-For entry, not X-Real-Ip, and not the first entry:
 *  - Traefik (forwardedheaders middleware), for a peer it does not trust —
 *    the default for the internet: neither forwardedHeaders.insecure nor a
 *    trustedIPs range covering it — deletes every incoming X-Forwarded-* and
 *    X-Real-Ip header, then sets X-Real-Ip to the peer address; Go's
 *    ReverseProxy then appends the peer address to X-Forwarded-For. So in the
 *    default setup both headers hold only the real address.
 *  - If the entry point is ever configured to trust forwarded headers
 *    (forwardedHeaders.insecure=true — a common hand-made tweak — or a broad
 *    trustedIPs), Traefik KEEPS a client-sent X-Real-Ip (it only fills it
 *    when empty) and keeps the client's X-Forwarded-For list — but still
 *    appends the real peer address at the end. The last entry is the one
 *    value that is right in both setups; X-Real-Ip and the first entry are
 *    client-controlled in the second.
 * X-Real-Ip is used only when there is no X-Forwarded-For at all (no proxy
 * that appends, e.g. a local run).
 *
 * The rate limiter's clientIp (lib/rate-limit.ts) prefers X-Real-Ip; for a
 * rate-limit bucket a spoof only moves the attacker to another bucket, here
 * it would change what the visitor is asked, so this takes the stricter rule.
 */
export function clientIpForGeo(headers: Headers): string | null {
  const xff = headers.get("x-forwarded-for");
  if (xff) {
    const hops = xff.split(",").map((s) => s.trim()).filter(Boolean);
    return normaliseIp(hops[hops.length - 1]);
  }
  return normaliseIp(headers.get("x-real-ip"));
}

/** The ISO country an address belongs to in the database, or undefined (private ranges, unknown, bad input). */
export function countryForIp(ip: string | null, reader: CountryReader | null): string | undefined {
  if (!ip || !reader) return undefined;
  try {
    const rec = reader.get(ip) as { country?: { iso_code?: unknown } } | null;
    return isoCountry(rec?.country?.iso_code);
  } catch {
    return undefined;
  }
}

let cached: { file: string; reader: CountryReader | null } | null = null;

/** The database file this process reads. */
export function geoDbPath(env: Env = process.env): string {
  return env.DENTVID_GEOIP_DB?.trim() || path.join(process.cwd(), GEOIP_DB_FILE);
}

/** The country database, read once per process; null when the file is missing or unreadable. */
export function countryReader(env: Env = process.env): CountryReader | null {
  const file = geoDbPath(env);
  if (cached?.file === file) return cached.reader;
  let reader: CountryReader | null = null;
  try {
    reader = new Reader(fs.readFileSync(file));
  } catch (e) {
    // No address in this message — only that the database could not be opened.
    if ((e as NodeJS.ErrnoException)?.code !== "ENOENT") console.error("[dentvideo geo] country database unreadable", (e as Error)?.message);
  }
  cached = { file, reader };
  return reader;
}

/** Tests only: forget the loaded database. */
export function resetCountryReader() {
  cached = null;
}

/**
 * The visitor's country for a request, as an ISO code — never the IP.
 *
 * With DENTVID_TRUST_EDGE_COUNTRY=1 a CDN's country header wins; otherwise
 * (production today) only the IP lookup counts and client-sent country
 * headers are ignored. Undefined when unknown.
 */
export function requestCountry(headers: Headers, opts: { env?: Env; reader?: CountryReader | null } = {}): string | undefined {
  const env = opts.env ?? process.env;
  if (env.DENTVID_TRUST_EDGE_COUNTRY === "1") {
    const edge = edgeCountry(headers);
    if (edge) return edge;
  }
  const reader = opts.reader !== undefined ? opts.reader : countryReader(env);
  return countryForIp(clientIpForGeo(headers), reader);
}
