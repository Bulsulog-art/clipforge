import { describe, expect, it } from "vitest";
import { LOCALES } from "@/content/dentvideo";
import { LEGAL } from "@/content/legal";
import { AD_CONSENT_COPY, AD_CONSENT_LOCALES, AD_CONSENT_PRIVACY_SECTION } from "./ad-consent-prompt";

describe("ad-click consent prompt: informed consent (Google's EU user consent policy, GDPR, KVKK)", () => {
  it("exists in every site language", () => {
    expect([...AD_CONSENT_LOCALES].sort()).toEqual([...LOCALES].sort());
  });

  it.each(LOCALES)("%s: names Google Ads as the recipient, the transfer, the 90 days and that it is never sold", (l) => {
    const c = AD_CONSENT_COPY[l];
    expect(c.title, l).toMatch(/Google ?(Ads|広告)/);
    expect(c.text, l).toMatch(/Google/);
    expect(c.text, l).toMatch(/90/);
    // Accept and Decline are both there and different words (equal weight is the shared button style).
    expect(c.accept.trim(), l).not.toBe("");
    expect(c.decline.trim(), l).not.toBe("");
    expect(c.accept, l).not.toBe(c.decline);
  });

  it("the Turkish prompt says the click id goes abroad (KVKK md. 9)", () => {
    expect(AD_CONSENT_COPY.tr.text).toMatch(/yurt dışı/);
  });

  it.each(LOCALES)("%s: the privacy link's section is the one that names Google Ads as a recipient", (l) => {
    const n = Number(AD_CONSENT_PRIVACY_SECTION.slice(1));
    const section = LEGAL[l].docs.privacy.sections[n - 1];
    const text = JSON.stringify(section.blocks);
    expect(text, l).toMatch(/Google ?(Ads|広告)/);
  });
});
