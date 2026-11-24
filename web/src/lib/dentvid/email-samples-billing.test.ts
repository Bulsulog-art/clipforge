import { describe, expect, it } from "vitest";
import { LOCALES } from "@/content/dentvideo-locales";
import { billingConfirmText } from "@/content/dentvideo-billing-confirm";
import { SAMPLE_KINDS, sampleEmailFor } from "./email-samples";
import { noticeDate } from "./retention-email";

/**
 * The dev email preview (/dentvideo/dev/email?kind=…) lists every email DentVideo sends, so the
 * two written billing confirmations are reviewed with the rest, and the shared email tests
 * (lifecycle-copy.test.ts, no-free-trial.test.ts) run over them in every language.
 */
describe("dev email preview: the billing confirmations", () => {
  it("lists the cancellation and the plan change", () => {
    expect(SAMPLE_KINDS).toContain("plan-cancelled");
    expect(SAMPLE_KINDS).toContain("plan-changed");
  });

  for (const lang of LOCALES) {
    it(`${lang}: both render in the clinic's language with their own subject`, () => {
      const { copy } = billingConfirmText(lang);
      const cancelled = sampleEmailFor("plan-cancelled", lang);
      expect(cancelled.subject).toBe(copy.cancelled.subject);
      expect(cancelled.text).toContain(noticeDate(lang, new Date("2026-12-10T12:00:00Z")));
      const changed = sampleEmailFor("plan-changed", lang);
      expect(changed.subject).toBe(copy.changed.subject.replace("{tier}", "Practice"));
      expect(changed.text).toContain("Practice");
    });
  }
});
