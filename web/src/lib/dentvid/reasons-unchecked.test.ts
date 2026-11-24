import { describe, expect, it } from "vitest";
import { clinicReasons, findingText } from "./reasons";
import { REASON_TEXT, reasonText } from "@/content/dentvideo-reasons";
import { LOCALES } from "@/content/dentvideo";

/**
 * A video whose picture-and-sound measurement could not run (the worker
 * stores "[dv:unchecked] qa unavailable", worker/src/dentvid/rows.ts) is
 * flagged, and the dentist reads why in their own language.
 */
describe("a video nobody could measure", () => {
  it("reads as its own reason, not the generic one", () => {
    expect(clinicReasons(["[dv:unchecked] qa unavailable"], "flagged")).toEqual(["unchecked"]);
    expect(clinicReasons(["[dv:unchecked] qa unavailable", "the video file is missing"], "flagged")).toEqual(["unchecked"]);
    expect(findingText("[dv:unchecked] qa unavailable")).toBe("qa unavailable");
  });

  it.each(LOCALES)("%s: a plain sentence that asks the dentist to watch it, without internal words or dashes", (l) => {
    const s = reasonText(l, "unchecked");
    expect(s).toBe(REASON_TEXT[l].unchecked);
    expect(s.length).toBeGreaterThan(10);
    expect(s).not.toMatch(/qa|unavailable|\[dv:|[—–!]/i);
    if (l !== "en") expect(s).not.toBe(REASON_TEXT.en.unchecked);
  });
});
