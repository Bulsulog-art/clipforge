/**
 * Security round 3 regressions (docs/SECURITY.md, "Round 3"). Each block
 * names the finding it guards.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { clinicProfileSchema } from "./profile";
import { alertSubject, renderAlert, resendSender } from "./ops-alert";
import { readyEmail } from "./email";
import { welcomeEmail } from "./lifecycle-email";

const base = { name: "Sample Dental Practice", country: "GB", language: "en", services: ["Implants"] };

describe("R3-1: one-line profile text, and every mail subject folded to one line", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("folds CR/LF (and NEL, LS, PS) in the profile's free text to a space", () => {
    for (const br of ["\r\n", "\n", "\r", "\u0085", " ", " "]) {
      const p = clinicProfileSchema.parse({ ...base, name: `A${br}Bcc: x@evil.example`, city: `B${br}C`, services: [`Im${br}plants`] });
      expect(p.name).toBe("A Bcc: x@evil.example");
      expect(p.city).toBe("B C");
      expect(p.services).toEqual(["Im plants"]);
    }
  });

  it("an owner alert subject is one line even when an older profile name holds a line break", () => {
    const a = { severity: "warning", titleTr: "x", titleEn: "y", what: [], done: [], todo: [], clinic: { id: "c1", name: "Evil\r\nBcc: victim@example.com" } } as unknown as Parameters<typeof alertSubject>[0];
    expect(alertSubject(a)).not.toMatch(/[\r\n]/);
    expect(renderAlert(a).subject).not.toMatch(/[\r\n]/);
  });

  it("the owner-alert sender folds whatever subject it is handed", async () => {
    const calls: Record<string, unknown>[] = [];
    const send = resendSender({ OWNER_ALERT_EMAIL: "owner@example.com", RESEND_API_KEY: "re_test" }, (async (_u: string, init: { body: string }) => {
      calls.push(JSON.parse(init.body));
      return new Response("{}", { status: 200 });
    }) as unknown as typeof fetch);
    expect(await send({ subject: "a\r\nBcc: x@evil.example", text: "t", html: "h" })).toBe(true);
    expect(calls[0].subject).toBe("a Bcc: x@evil.example");
  });

  it("sendEmail folds the subject too", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test");
    const calls: Record<string, unknown>[] = [];
    vi.stubGlobal("fetch", async (_u: string, init: { body: string }) => {
      calls.push(JSON.parse(init.body));
      return new Response("{}", { status: 200 });
    });
    const { sendEmail } = await import("./email");
    expect(await sendEmail("qa+x@bulsulabs.com", { subject: "Hi\r\nBcc: x@evil.example", html: "<p>x</p>", text: "x" }, { log: null })).toBe(true);
    expect(calls[0].subject).toBe("Hi Bcc: x@evil.example");
  });
});

describe("R3-2: the minimum length is counted in code points, as the database guard does", () => {
  it("refuses a 2-emoji closing line (4 UTF-16 units) and a 1-emoji service", () => {
    expect(clinicProfileSchema.safeParse({ ...base, closingLine: "😀😀" }).success).toBe(false);
    expect(clinicProfileSchema.safeParse({ ...base, services: ["😀"] }).success).toBe(false);
    expect(clinicProfileSchema.safeParse({ ...base, closingLine: "😀😀😀😀" }).success).toBe(true);
  });

  it("stays linear on a huge field (no backtracking in the new line-break fold)", () => {
    const t0 = performance.now();
    expect(clinicProfileSchema.safeParse({ ...base, name: " ".repeat(500_000) + "x", closingLine: "\n ".repeat(200_000) }).success).toBe(false);
    expect(performance.now() - t0).toBeLessThan(1000);
  });
});

describe("R3-3: clinic-typed text in emails is escaped, links are ours", () => {
  const evil = `<img src=x onerror=alert(1)>"'&`;
  it("readyEmail escapes the clinic name and drops non-http(s) video links", () => {
    const m = readyEmail({
      kind: "week",
      counts: { ready: 2, flagged: 0 },
      clinicName: evil,
      language: "en",
      appUrl: "https://dentvideo.com/app",
      videos: [
        { title: evil, href: "javascript:alert(1)", action: "Approve" },
        { title: "ok", href: "https://dentvideo.com/p/x", action: "Approve", caption: evil },
      ],
    })!;
    expect(m.html).not.toContain("<img src=x");
    expect(m.html).not.toContain("javascript:");
    expect(m.html).toContain("&lt;img src=x onerror=alert(1)&gt;");
    expect(m.subject).not.toContain("<");
  });

  it("the welcome email escapes the clinic name and keeps it out of the subject", () => {
    const m = welcomeEmail({ language: "en", clinicName: evil, appUrl: "https://dentvideo.com/app" });
    expect(m.html).not.toContain("<img src=x");
    expect(m.subject).not.toContain("img");
  });
});
