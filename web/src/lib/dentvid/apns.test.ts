import crypto from "node:crypto";
import { describe, expect, it } from "vitest";
import { LOCALES } from "@/content/dentvideo-locales";
import { APNS_HOSTS, PUSH_TEXT, apnsBody, apnsConfig, apnsJwt, isDeadToken, pushText, sendReadyPush, type ApnsSend } from "./apns";
import { aasaFor } from "./aasa";

const { privateKey, publicKey } = crypto.generateKeyPairSync("ec", { namedCurve: "P-256" });
const P8 = privateKey.export({ type: "pkcs8", format: "pem" }).toString();
const ENV = { APNS_KEY_ID: "KEY1234567", APNS_TEAM_ID: "TEAM123456", APNS_KEY_P8: P8.replace(/\n/g, "\\n") };

type Row = Record<string, unknown>;
function fakeAdmin(tables: { dentvid_clinics: Row[]; dentvid_devices: Row[] | null }) {
  const deleted: string[] = [];
  const from = (t: "dentvid_clinics" | "dentvid_devices") => {
    const f: [string, unknown, "eq" | "in"][] = [];
    let del = false;
    const run = () => {
      const rows = tables[t];
      if (rows === null) return { data: null, error: { code: "42P01", message: "relation dentvid_devices does not exist" } };
      const m = rows.filter((r) => f.every(([k, v, op]) => (op === "eq" ? r[k] === v : (v as unknown[]).includes(r[k]))));
      if (del) {
        m.forEach((r) => deleted.push(r.token as string));
        tables[t] = rows.filter((r) => !m.includes(r));
        return { data: null, error: null };
      }
      return { data: m, error: null };
    };
    const q = {
      select: () => q,
      delete: () => ((del = true), q),
      eq: (k: string, v: unknown) => (f.push([k, v, "eq"]), q),
      in: (k: string, v: unknown[]) => (f.push([k, v, "in"]), q),
      limit: () => q,
      maybeSingle: async () => ({ data: run().data?.[0] ?? null, error: null }),
      then: (res: (v: unknown) => unknown) => Promise.resolve(run()).then(res),
    };
    return q;
  };
  return { admin: { from } as never, deleted, tables };
}

const OWNER = "owner-1";
const clinics = () => [{ id: "c1", owner_id: OWNER, profile: { language: "tr" } }];
const dev = (token: string, environment = "production", ready_push = true, owner_id = OWNER) => ({ token, environment, ready_push, owner_id });

describe("push texts", () => {
  it("exist in all eight languages, with no price, claim or '#1'", () => {
    for (const l of LOCALES) {
      const t = PUSH_TEXT[l];
      for (const v of Object.values(t)) {
        expect(v.trim(), l).not.toBe("");
        expect(v, l).not.toMatch(/€|\$|#1|best|free|%/i);
      }
      expect(t.weekBody, l).toContain("{n}");
      expect(t.weekBodyLook, l).toContain("{f}");
    }
  });
  it("fills the counts in the clinic's language; Italian falls back to English", () => {
    expect(pushText("tr", "week", { ready: 4, flagged: 1 })).toEqual({ title: "Haftanız hazır", body: "5 video onayınızı bekliyor, 1 tanesine kısaca bakmanız gerekiyor." });
    expect(pushText("it", "week", { ready: 5, flagged: 0 }).body).toBe("5 videos are ready for your review.");
    expect(pushText("de", "recording", { ready: 1, flagged: 0 }).title).toBe("Ihre Aufnahme ist fertig");
  });
  it("the payload carries the screen to open and no badge", () => {
    const b = JSON.parse(apnsBody({ title: "t", body: "b" }, "week"));
    expect(b).toEqual({ aps: { alert: { title: "t", body: "b" }, sound: "default", "thread-id": "dentvideo-week" }, kind: "week_ready" });
  });
});

describe("provider token", () => {
  it("is an ES256 JWT that verifies with the key's public half", () => {
    const cfg = apnsConfig(ENV)!;
    expect(cfg.topic).toBe("com.bulsulabs.dentvideo");
    const jwt = apnsJwt(cfg, new Date("2026-11-16T07:00:00Z"));
    const [h, c, s] = jwt.split(".");
    expect(JSON.parse(Buffer.from(h, "base64url").toString())).toEqual({ alg: "ES256", kid: "KEY1234567" });
    expect(JSON.parse(Buffer.from(c, "base64url").toString())).toEqual({ iss: "TEAM123456", iat: 1794812400 });
    const ok = crypto.createVerify("SHA256").update(`${h}.${c}`).verify({ key: publicKey, dsaEncoding: "ieee-p1363" }, Buffer.from(s, "base64url"));
    expect(ok).toBe(true);
  });
  it("is not configured without all three keys", () => {
    expect(apnsConfig({ APNS_KEY_ID: "x", APNS_TEAM_ID: "y" })).toBeNull();
    expect(apnsConfig({ ...ENV, DENTVID_APNS_BUNDLE_ID: "com.example.other" })!.topic).toBe("com.example.other");
  });
});

describe("sendReadyPush", () => {
  it("pushes to the owner's devices that keep the push on, each on its own APNs host", async () => {
    const f = fakeAdmin({ dentvid_clinics: clinics(), dentvid_devices: [dev("aa"), dev("bb", "development"), dev("cc", "production", false), dev("dd", "production", true, "someone-else")] });
    const calls: Parameters<ApnsSend>[0][] = [];
    const send: ApnsSend = async (a) => (calls.push(a), { status: 200 });
    const r = await sendReadyPush(f.admin, "c1", "week", { ready: 5, flagged: 0 }, { send, env: ENV });
    expect(r).toEqual({ sent: 2, failed: 0, removed: 0 });
    expect(calls.map((c) => [c.token, c.host])).toEqual([["aa", APNS_HOSTS.production], ["bb", APNS_HOSTS.development]]);
    expect(calls[0].topic).toBe("com.bulsulabs.dentvideo");
    expect(JSON.parse(calls[0].body).aps.alert.title).toBe("Haftanız hazır");
  });
  it("deletes tokens APNs reports as gone, keeps the others", async () => {
    const f = fakeAdmin({ dentvid_clinics: clinics(), dentvid_devices: [dev("aa"), dev("bb"), dev("cc")] });
    const send: ApnsSend = async ({ token }) => (token === "aa" ? { status: 410, reason: "Unregistered" } : token === "bb" ? { status: 400, reason: "BadDeviceToken" } : { status: 429, reason: "TooManyRequests" });
    const r = await sendReadyPush(f.admin, "c1", "week", { ready: 1, flagged: 0 }, { send, env: ENV });
    expect(r).toEqual({ sent: 0, failed: 3, removed: 2 });
    expect(f.deleted.sort()).toEqual(["aa", "bb"]);
  });
  it("never throws and sends nothing without keys, without devices, before 0023, or with nothing ready", async () => {
    const send: ApnsSend = async () => {
      throw new Error("must not send");
    };
    expect((await sendReadyPush(fakeAdmin({ dentvid_clinics: clinics(), dentvid_devices: [dev("aa")] }).admin, "c1", "week", { ready: 1, flagged: 0 }, { send, env: {} })).reason).toBe("not configured");
    expect((await sendReadyPush(fakeAdmin({ dentvid_clinics: clinics(), dentvid_devices: [] }).admin, "c1", "week", { ready: 1, flagged: 0 }, { send, env: ENV })).reason).toBe("no devices");
    expect((await sendReadyPush(fakeAdmin({ dentvid_clinics: clinics(), dentvid_devices: null }).admin, "c1", "week", { ready: 1, flagged: 0 }, { send, env: ENV })).reason).toBe("no devices");
    expect((await sendReadyPush(fakeAdmin({ dentvid_clinics: clinics(), dentvid_devices: [dev("aa")] }).admin, "c1", "week", { ready: 0, flagged: 0 }, { send, env: ENV })).reason).toBe("nothing ready");
    expect((await sendReadyPush(fakeAdmin({ dentvid_clinics: [], dentvid_devices: [dev("aa")] }).admin, "c1", "week", { ready: 1, flagged: 0 }, { send, env: ENV })).reason).toBe("no clinic");
    // An unreachable APNs counts as failed, nothing more.
    const r = await sendReadyPush(fakeAdmin({ dentvid_clinics: clinics(), dentvid_devices: [dev("aa")] }).admin, "c1", "week", { ready: 1, flagged: 0 }, { send, env: ENV });
    expect(r).toEqual({ sent: 0, failed: 1, removed: 0 });
  });
  it("dead-token rule", () => {
    expect(isDeadToken({ status: 410 })).toBe(true);
    expect(isDeadToken({ status: 400, reason: "DeviceTokenNotForTopic" })).toBe(true);
    expect(isDeadToken({ status: 400, reason: "PayloadTooLarge" })).toBe(false);
    expect(isDeadToken({ status: 500 })).toBe(false);
  });
});

describe("apple-app-site-association per host", () => {
  it("dentvideo.com opens the clinic app pages in the DentVideo app; other hosts keep ClipForge's", () => {
    expect(aasaFor("dentvideo.com", "TEAM", {})).toEqual({ applinks: { apps: [], details: [{ appID: "TEAM.com.bulsulabs.dentvideo", paths: ["/app", "/app/*"] }] } });
    expect(aasaFor("www.dentvideo.com:443", "TEAM", {}).applinks.details[0].appID).toBe("TEAM.com.bulsulabs.dentvideo");
    expect(aasaFor("clipforge.bulsulabs.com", "TEAM", {})).toEqual({ applinks: { apps: [], details: [{ appID: "TEAM.com.bulsulabs.clipforge", paths: ["/clips/*", "/jobs/*"] }] } });
    expect(aasaFor(null, "TEAM", {}).applinks.details[0].appID).toBe("TEAM.com.bulsulabs.clipforge");
  });
});
