import { describe, expect, it } from "vitest";
import { en as helpEn } from "@/content/help/en";
import { MARKET_HARD_RULES } from "./hard-rules";

/**
 * Two British spellings that slipped past the shared-English sweep (content/en-spelling.test.ts reads
 * web/src/content only): the help center's "Who is responsible" answer, and the ad checker's rule
 * explanations, which live in worker/src/dental/hard-rules.ts and reach the browser through the
 * generated web copy (scripts/sync-hard-rules.mjs).
 */

/** The ad checker's explanations outside the British-English markets (UK, Ireland, Australia, New Zealand). */
const BRITISH_MARKETS = new Set(["UK", "GB", "IE", "AU", "NZ"]);

describe("US spelling in the follow-up texts", () => {
  it("the help center says 'judgment' (US), never 'judgement'", () => {
    const all = JSON.stringify(helpEn);
    expect(all).not.toMatch(/judgement/i);
    expect(all).toContain("it does not replace your judgment or legal advice");
  });

  it("the ad checker explains the specialist rules with 'recognized'", () => {
    const whys = Object.entries(MARKET_HARD_RULES)
      .filter(([market]) => !BRITISH_MARKETS.has(market))
      .flatMap(([, rules]) => rules.map((r) => r.why));
    expect(whys.length).toBeGreaterThan(0);
    for (const why of whys) expect(why).not.toMatch(/recognis/i);
    expect(whys).toContain(
      "Calling the practice or dentist a specialist needs a recognized title or proven expertise the writer cannot verify: the clinic adds it itself if it holds one (DE MBO-Z § 21, AT ZÄG § 35, CH MedBG Art. 40).",
    );
    expect(whys.some((w) => w.startsWith("Announcing as a specialist or board-certified is limited to recognized specialties"))).toBe(true);
  });
});
