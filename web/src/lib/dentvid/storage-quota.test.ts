import { describe, expect, it } from "vitest";
import { LOGO_MAX_BYTES, STORAGE_QUOTA, canRecord, decideUpload, extFor } from "./storage-quota";
import { consentParts, legalPagesOn } from "./legal";

const MB = 1024 * 1024;
const empty = { files: 0, bytes: 0 };

describe("decideUpload", () => {
  it("lets any account upload a logo (the wizard asks for one before payment)", () => {
    expect(decideUpload({ kind: "logo", plan: "trial", tier: null, usage: empty, size: 200_000, contentType: "image/png" })).toEqual({ ok: true });
    expect(decideUpload({ kind: "logo", plan: undefined, tier: undefined, usage: empty, size: 200_000, contentType: "IMAGE/JPEG" })).toEqual({ ok: true });
  });

  it("refuses recordings unless the clinic is active on a plan with recordings", () => {
    const rec = { kind: "recording" as const, usage: empty, size: 50 * MB, contentType: "video/mp4" };
    expect(decideUpload({ ...rec, plan: "trial", tier: null })).toEqual({ ok: false, reason: "plan" });
    expect(decideUpload({ ...rec, plan: "cancelled", tier: "practice" })).toEqual({ ok: false, reason: "plan" });
    expect(decideUpload({ ...rec, plan: "paused", tier: "group" })).toEqual({ ok: false, reason: "plan" });
    expect(decideUpload({ ...rec, plan: "active", tier: "starter" })).toEqual({ ok: false, reason: "plan" });
    expect(decideUpload({ ...rec, plan: "active", tier: "practice" })).toEqual({ ok: true });
    expect(canRecord("active", "group")).toBe(true);
  });

  it("checks type and size per kind", () => {
    expect(decideUpload({ kind: "logo", plan: "trial", tier: null, usage: empty, size: 1000, contentType: "video/mp4" })).toEqual({ ok: false, reason: "type" });
    expect(decideUpload({ kind: "logo", plan: "trial", tier: null, usage: empty, size: 1000, contentType: "image/svg+xml" })).toEqual({ ok: false, reason: "type" });
    expect(decideUpload({ kind: "logo", plan: "trial", tier: null, usage: empty, size: LOGO_MAX_BYTES + 1, contentType: "image/png" })).toEqual({ ok: false, reason: "size" });
    expect(decideUpload({ kind: "recording", plan: "active", tier: "group", usage: empty, size: 501 * MB, contentType: "video/mp4" })).toEqual({ ok: false, reason: "size" });
    expect(decideUpload({ kind: "logo", plan: "trial", tier: null, usage: empty, size: 0, contentType: "image/png" })).toEqual({ ok: false, reason: "size" });
  });

  it("caps files and bytes per owner, lower for an unpaid account", () => {
    const logo = { kind: "logo" as const, tier: null, size: 1 * MB, contentType: "image/png" };
    expect(decideUpload({ ...logo, plan: "trial", usage: { files: STORAGE_QUOTA.unpaid.files, bytes: 0 } })).toEqual({ ok: false, reason: "quota" });
    expect(decideUpload({ ...logo, plan: "trial", usage: { files: 1, bytes: 49.5 * MB } })).toEqual({ ok: false, reason: "quota" });
    expect(decideUpload({ ...logo, plan: "active", usage: { files: 100, bytes: 49.5 * MB } })).toEqual({ ok: true });
    expect(decideUpload({ kind: "recording", plan: "active", tier: "group", size: 400 * MB, contentType: "video/mp4", usage: { files: 10, bytes: STORAGE_QUOTA.active.bytes - 100 * MB } })).toEqual({ ok: false, reason: "quota" });
  });
});

describe("extFor", () => {
  it("keeps an allowed extension, else derives one from the type", () => {
    expect(extFor("logo", "Logo.PNG", "image/png")).toBe("png");
    expect(extFor("logo", "logo", "image/jpeg")).toBe("jpg");
    expect(extFor("logo", "x.svg", "image/webp")).toBe("webp");
    expect(extFor("recording", "clip.MOV", "video/quicktime")).toBe("mov");
    expect(extFor("recording", "clip", "video/quicktime")).toBe("mov");
    expect(extFor("recording", undefined, "video/mp4")).toBe("mp4");
  });
});

describe("legal pages switch", () => {
  it("is on unless DENTVIDEO_LEGAL_PAGES=off (the legal pages exist)", () => {
    expect(legalPagesOn({})).toBe(true);
    expect(legalPagesOn({ DENTVIDEO_LEGAL_PAGES: "" })).toBe(true);
    expect(legalPagesOn({ DENTVIDEO_LEGAL_PAGES: "on" })).toBe(true);
    expect(legalPagesOn({ DENTVIDEO_LEGAL_PAGES: " OFF " })).toBe(false);
    expect(legalPagesOn({ DENTVIDEO_LEGAL_PAGES: "0" })).toBe(false);
  });

  it("splits the consent sentence around its two links", () => {
    expect(consentParts("By creating an account, you agree to the {terms} and the {privacy}.")).toEqual([
      "By creating an account, you agree to the ",
      "{terms}",
      " and the ",
      "{privacy}",
      ".",
    ]);
    expect(consentParts("{terms}と{privacy}に同意")).toEqual(["{terms}", "と", "{privacy}", "に同意"]);
  });
});
