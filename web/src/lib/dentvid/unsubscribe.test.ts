import { describe, expect, it, vi } from "vitest";
import { handleUnsubscribe, type UnsubDeps } from "./unsubscribe";
import { MissingSchemaError, type ClinicForMail, type LifecycleStore } from "./lifecycle";
import { unsubscribeToken } from "./unsubscribe-token";

const ID = "11111111-2222-4333-8444-555555555555";
const SECRET = "s3cret";
const url = (t: string) => `https://dentvideo.com/api/dentvideo/unsubscribe?t=${encodeURIComponent(t)}`;

function setup(language = "de", opts: { missing?: boolean; noClinic?: boolean } = {}) {
  const clinic: ClinicForMail = { id: ID, owner_id: "o", profile: { name: "Praxis", language }, plan: "trial", created_at: "2026-11-01T00:00:00Z", email_opt_out_at: null };
  const optOut = vi.fn(async (_id: string, at: Date) => {
    if (opts.missing) throw new MissingSchemaError("dentvid_clinics.email_opt_out_at");
    clinic.email_opt_out_at = at.toISOString();
    return true;
  });
  const store = { clinic: async () => (opts.noClinic ? null : { ...clinic }), optOut } as unknown as LifecycleStore;
  const deps: UnsubDeps = { store: () => store, secret: SECRET, homeUrl: "https://dentvideo.com", now: () => new Date("2026-11-09T10:00:00Z") };
  return { clinic, optOut, deps };
}

describe("unsubscribe (RFC 8058: GET confirms, POST acts)", () => {
  it("GET with a valid token shows a confirmation with a POST button and changes nothing", async () => {
    const { clinic, optOut, deps } = setup("de");
    const r = await handleUnsubscribe({ method: "GET", url: url(unsubscribeToken(ID, SECRET)) }, deps);
    expect(r.status).toBe(200);
    expect(r.body).toContain("Von Erinnerungen abmelden?");
    expect(r.body).toMatch(/<form method="post" action="\/api\/dentvideo\/unsubscribe\?t=[^"]+"/);
    expect(r.body).toContain(">Abmelden</button>");
    expect(optOut).not.toHaveBeenCalled();
    expect(clinic.email_opt_out_at).toBeNull();
  });

  it("a scanner opening the link many times still opts nobody out", async () => {
    const { optOut, deps } = setup();
    for (let i = 0; i < 5; i++) await handleUnsubscribe({ method: "GET", url: url(unsubscribeToken(ID, SECRET)) }, deps);
    expect(optOut).not.toHaveBeenCalled();
  });

  it("POST from the button opts out and shows the done page in the clinic's language", async () => {
    const { clinic, deps } = setup("ar");
    const r = await handleUnsubscribe({ method: "POST", url: url(unsubscribeToken(ID, SECRET)), accept: "text/html,application/xhtml+xml" }, deps);
    expect(r.status).toBe(200);
    expect(r.body).toContain("تم إلغاء اشتراككم");
    expect(r.body).toContain('dir="rtl"');
    expect(clinic.email_opt_out_at).toBe("2026-11-09T10:00:00.000Z");
  });

  it("one-click POST from a mail client opts out with a plain 200", async () => {
    const { clinic, deps } = setup();
    const r = await handleUnsubscribe({ method: "POST", url: url(unsubscribeToken(ID, SECRET)), accept: "*/*" }, deps);
    expect(r).toMatchObject({ status: 200, contentType: "text/plain", body: "unsubscribed" });
    expect(clinic.email_opt_out_at).not.toBeNull();
  });

  it("rejects invalid tokens on GET and POST without touching the database", async () => {
    const { optOut, deps } = setup();
    const store = vi.fn(deps.store);
    const d = { ...deps, store };
    const forged = `${ID}.${"A".repeat(32)}`;
    for (const t of [forged, unsubscribeToken(ID, "other-secret"), "junk", ""]) {
      expect((await handleUnsubscribe({ method: "GET", url: url(t) }, d)).status).toBe(400);
      expect((await handleUnsubscribe({ method: "POST", url: url(t) }, d)).status).toBe(400);
    }
    const page = await handleUnsubscribe({ method: "GET", url: url(forged) }, d);
    expect(page.body).toContain("This link doesn&#39;t work");
    expect(page.body).not.toContain("<form");
    expect(store).not.toHaveBeenCalled();
    expect(optOut).not.toHaveBeenCalled();
  });

  it("without migration 0005: GET still confirms, POST reports an error instead of claiming success", async () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    const { deps } = setup("en", { missing: true });
    expect((await handleUnsubscribe({ method: "GET", url: url(unsubscribeToken(ID, SECRET)) }, deps)).status).toBe(200);
    const r = await handleUnsubscribe({ method: "POST", url: url(unsubscribeToken(ID, SECRET)), accept: "text/html" }, deps);
    expect(r.status).toBe(503);
    expect(r.body).toContain("That didn&#39;t save");
    err.mockRestore();
  });

  it("a broken link speaks the visitor's language when it is known, else English", async () => {
    const { deps } = setup();
    const pl = await handleUnsubscribe({ method: "GET", url: url("junk"), language: "pl" }, deps);
    expect(pl.status).toBe(400);
    expect(pl.body).toContain('lang="pl"');
    expect(pl.body).not.toContain("This link doesn&#39;t work");
    const ar = await handleUnsubscribe({ method: "GET", url: url("junk"), language: "ar" }, deps);
    expect(ar.body).toContain('dir="rtl"');
    const unknown = await handleUnsubscribe({ method: "GET", url: url("junk"), language: "it" }, deps);
    expect(unknown.body).toContain("This link doesn&#39;t work");
  });

  it("the clinic's language wins over the visitor's once the link is valid", async () => {
    const { deps } = setup("de");
    const r = await handleUnsubscribe({ method: "GET", url: url(unsubscribeToken(ID, SECRET)), language: "fr" }, deps);
    expect(r.body).toContain("Von Erinnerungen abmelden?");
  });

  it("a deleted clinic is confirmed, not an error", async () => {
    const { optOut, deps } = setup("en", { noClinic: true });
    const r = await handleUnsubscribe({ method: "POST", url: url(unsubscribeToken(ID, SECRET)) }, deps);
    expect(r.status).toBe(200);
    expect(optOut).not.toHaveBeenCalled();
  });
});
