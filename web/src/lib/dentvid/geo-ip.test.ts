import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Reader } from "mmdb-lib";
import { clientIpForGeo, countryForIp, countryReader, edgeCountry, normaliseIp, requestCountry, resetCountryReader, type CountryReader } from "./geo-ip";

/**
 * A tiny MaxMind-format (mmdb) database written here, so the lookup is tested
 * against the same reader and file format as production without shipping
 * DB-IP's 8 MB file in the repository. IPv4 tree, 24-bit records.
 */
function mmdbFixture(networks: [string, number, string][]): Buffer {
  const uint = (type: number, n: number | bigint) => {
    let v = BigInt(n);
    const bytes: number[] = [];
    while (v > 0n) {
      bytes.unshift(Number(v & 0xffn));
      v >>= 8n;
    }
    // uint16 = 5, uint32 = 6; uint64 = extended 9.
    return type === 9 ? Buffer.from([bytes.length, 9 - 7, ...bytes]) : Buffer.from([(type << 5) | bytes.length, ...bytes]);
  };
  const str = (s: string) => Buffer.concat([Buffer.from([(2 << 5) | Buffer.byteLength(s)]), Buffer.from(s)]);
  const map = (entries: [string, Buffer][]) => Buffer.concat([Buffer.from([(7 << 5) | entries.length]), ...entries.flatMap(([k, v]) => [str(k), v])]);
  const array = (items: Buffer[]) => Buffer.concat([Buffer.from([items.length, 11 - 7]), ...items]);

  // Data section: one record per country.
  const offsets = new Map<string, number>();
  const data: Buffer[] = [];
  let size = 0;
  for (const [, , cc] of networks) {
    if (offsets.has(cc)) continue;
    const rec = map([["country", map([["iso_code", str(cc)]])]]);
    offsets.set(cc, size);
    data.push(rec);
    size += rec.length;
  }

  // Search tree: each node has a left (bit 0) and right (bit 1) record.
  type Rec = { node: number } | { data: number } | null;
  const nodes: [Rec, Rec][] = [[null, null]];
  for (const [ip, len, cc] of networks) {
    const bits = ip.split(".").reduce((n, o) => (n << 8) + Number(o), 0) >>> 0;
    let at = 0;
    for (let i = 0; i < len; i++) {
      const b = (bits >>> (31 - i)) & 1;
      if (i === len - 1) {
        nodes[at][b] = { data: offsets.get(cc)! };
        break;
      }
      const next = nodes[at][b];
      if (next && "node" in next) at = next.node;
      else {
        nodes.push([null, null]);
        nodes[at][b] = { node: nodes.length - 1 };
        at = nodes.length - 1;
      }
    }
  }
  const n = nodes.length;
  const tree = Buffer.alloc(n * 6);
  const value = (r: Rec) => (r === null ? n : "node" in r ? r.node : n + 16 + r.data);
  nodes.forEach(([l, r], i) => {
    tree.writeUIntBE(value(l), i * 6, 3);
    tree.writeUIntBE(value(r), i * 6 + 3, 3);
  });

  const metadata = map([
    ["binary_format_major_version", uint(5, 2)],
    ["binary_format_minor_version", uint(5, 0)],
    ["build_epoch", uint(9, 1_700_000_000)],
    ["database_type", str("Test-Country")],
    ["description", map([["en", str("fixture")]])],
    ["ip_version", uint(5, 4)],
    ["languages", array([str("en")])],
    ["node_count", uint(6, n)],
    ["record_size", uint(5, 24)],
  ]);
  return Buffer.concat([tree, Buffer.alloc(16), ...data, Buffer.from("\xab\xcd\xefMaxMind.com", "latin1"), metadata]);
}

const FIXTURE = mmdbFixture([
  ["88.255.0.0", 16, "TR"],
  ["194.25.0.0", 16, "DE"],
  ["8.8.8.0", 24, "US"],
  ["203.0.113.0", 24, "CH"],
]);
const reader: CountryReader = new Reader(FIXTURE);
const h = (o: Record<string, string>) => new Headers(o);
const PROD = { NODE_ENV: "production" };

afterEach(() => {
  resetCountryReader();
  vi.restoreAllMocks();
});

describe("geo-ip: the client address behind Traefik", () => {
  it("takes the LAST X-Forwarded-For hop (the one Traefik appended), never the client-written first ones", () => {
    expect(clientIpForGeo(h({ "x-forwarded-for": "88.255.1.1" }))).toBe("88.255.1.1");
    // A client that sends its own X-Forwarded-For only adds entries in front of the real one.
    expect(clientIpForGeo(h({ "x-forwarded-for": "88.255.1.1, 194.25.3.4" }))).toBe("194.25.3.4");
    expect(clientIpForGeo(h({ "x-forwarded-for": " 1.1.1.1 ,  194.25.3.4 , " }))).toBe("194.25.3.4");
  });

  it("prefers X-Forwarded-For over X-Real-Ip (which a trusting Traefik would pass through from the client)", () => {
    expect(clientIpForGeo(h({ "x-real-ip": "88.255.1.1", "x-forwarded-for": "194.25.3.4" }))).toBe("194.25.3.4");
    // No proxy that appends (a local run): X-Real-Ip is all there is.
    expect(clientIpForGeo(h({ "x-real-ip": "194.25.3.4" }))).toBe("194.25.3.4");
    expect(clientIpForGeo(h({}))).toBeNull();
  });

  it("normalises ports, brackets, zone ids and IPv4-mapped IPv6; rejects anything that is not an address", () => {
    expect(normaliseIp("194.25.3.4:51234")).toBe("194.25.3.4");
    expect(normaliseIp("[2001:db8::1]:443")).toBe("2001:db8::1");
    expect(normaliseIp("fe80::1%eth0")).toBe("fe80::1");
    expect(normaliseIp("::ffff:88.255.1.1")).toBe("88.255.1.1");
    for (const bad of ["", "unknown", "88.255.1", "TR", "<script>", "999.1.1.1"]) expect(normaliseIp(bad), bad).toBeNull();
    expect(clientIpForGeo(h({ "x-forwarded-for": "88.255.1.1, garbage" }))).toBeNull();
  });
});

describe("geo-ip: IP → country from the local database", () => {
  it("looks the address up in an mmdb file (real reader, fixture database)", () => {
    expect(countryForIp("88.255.1.1", reader)).toBe("TR");
    expect(countryForIp("194.25.200.9", reader)).toBe("DE");
    expect(countryForIp("8.8.8.8", reader)).toBe("US");
    // Not in the database, private, or not even an address: unknown.
    expect(countryForIp("9.9.9.9", reader)).toBeUndefined();
    expect(countryForIp("10.0.0.1", reader)).toBeUndefined();
    expect(countryForIp("2001:db8::1", reader)).toBeUndefined(); // IPv6 against an IPv4-only file: no throw
    expect(countryForIp(null, reader)).toBeUndefined();
    expect(countryForIp("88.255.1.1", null)).toBeUndefined();
  });

  it("ignores placeholder codes a database may carry", () => {
    const fake = (iso: unknown): CountryReader => ({ get: () => ({ country: { iso_code: iso } }) });
    for (const iso of ["XX", "T1", "EU", "AP", "ZZ", "TUR", 90, null]) expect(countryForIp("1.2.3.4", fake(iso)), String(iso)).toBeUndefined();
    expect(countryForIp("1.2.3.4", fake("tr"))).toBe("TR");
  });

  it("requestCountry: the IP lookup decides; client-sent CF-IPCountry / X-Vercel-IP-Country / X-Country-Code are ignored", () => {
    const de = { "x-forwarded-for": "194.25.3.4" };
    expect(requestCountry(h(de), { env: PROD, reader })).toBe("DE");
    // The spoof from the QA report: a German visitor claiming Türkiye to skip the consent prompt.
    for (const spoof of ["cf-ipcountry", "x-vercel-ip-country", "x-country-code"]) {
      expect(requestCountry(h({ ...de, [spoof]: "TR" }), { env: PROD, reader }), spoof).toBe("DE");
      // …and with no known address, a spoofed header still gives nothing.
      expect(requestCountry(h({ [spoof]: "TR" }), { env: PROD, reader }), spoof).toBeUndefined();
    }
    // A spoofed X-Forwarded-For prefix does not help either.
    expect(requestCountry(h({ "x-forwarded-for": "88.255.1.1, 194.25.3.4" }), { env: PROD, reader })).toBe("DE");
  });

  it("trusts an edge country header only with DENTVID_TRUST_EDGE_COUNTRY=1 (a future CDN), then falls back to the IP", () => {
    const env = { DENTVID_TRUST_EDGE_COUNTRY: "1" };
    expect(requestCountry(h({ "cf-ipcountry": "tr", "x-forwarded-for": "194.25.3.4" }), { env, reader })).toBe("TR");
    expect(requestCountry(h({ "cf-ipcountry": "XX", "x-forwarded-for": "194.25.3.4" }), { env, reader })).toBe("DE");
    expect(edgeCountry(h({ "x-vercel-ip-country": "DE" }))).toBe("DE");
    expect(edgeCountry(h({ "x-country-code": "PL" }))).toBe("PL");
    expect(edgeCountry(h({ "cf-ipcountry": "T1" }))).toBeUndefined();
    expect(edgeCountry(h({}))).toBeUndefined();
  });

  it("reads the database file once; a missing file means 'unknown', not an error", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "geoip-"));
    const file = path.join(dir, "db.mmdb");
    fs.writeFileSync(file, FIXTURE);
    const read = vi.spyOn(fs, "readFileSync");
    const env = { DENTVID_GEOIP_DB: file };
    expect(requestCountry(h({ "x-forwarded-for": "88.255.9.9" }), { env })).toBe("TR");
    expect(requestCountry(h({ "x-forwarded-for": "203.0.113.7" }), { env })).toBe("CH");
    expect(read).toHaveBeenCalledTimes(1);

    resetCountryReader();
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const missing = { DENTVID_GEOIP_DB: path.join(dir, "nope.mmdb") };
    expect(countryReader(missing)).toBeNull();
    expect(requestCountry(h({ "x-forwarded-for": "88.255.9.9" }), { env: missing })).toBeUndefined();
    expect(error).not.toHaveBeenCalled();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("never logs the address", () => {
    const logs = [vi.spyOn(console, "log"), vi.spyOn(console, "warn"), vi.spyOn(console, "error"), vi.spyOn(console, "info")].map((s) => s.mockImplementation(() => {}));
    const broken = { DENTVID_GEOIP_DB: path.join(os.tmpdir(), "geoip-not-a-db-" + Date.now()) };
    fs.writeFileSync(broken.DENTVID_GEOIP_DB, "not an mmdb");
    requestCountry(h({ "x-forwarded-for": "88.255.9.9" }), { env: broken });
    requestCountry(h({ "x-forwarded-for": "88.255.9.9" }), { env: PROD, reader });
    for (const s of logs) for (const call of s.mock.calls) expect(JSON.stringify(call)).not.toContain("88.255.9.9");
    fs.rmSync(broken.DENTVID_GEOIP_DB, { force: true });
  });
});
