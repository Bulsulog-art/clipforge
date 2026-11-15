import { describe, expect, it } from "vitest";
import { CLINIC_REASONS, clinicReasons, findingText, reasonCode } from "./reasons";
import { REASON_TEXT } from "@/content/dentvideo-reasons";
import { LOCALES } from "@/content/dentvideo";

describe("clinic reasons", () => {
  it("reads the worker's codes", () => {
    expect(clinicReasons(["[dv:pause] quality: 3.1s of silence (max 3s)"], "flagged")).toEqual(["pause"]);
    expect(clinicReasons(['[dv:skipped] say each point once: "a" repeats "b" — cut the repeat'], "rejected")).toEqual(["skipped"]);
    expect(clinicReasons(["[dv:wording] x", "[dv:wording] y", "[dv:opening] z"], "flagged")).toEqual(["wording", "opening"]);
  });

  it("maps rows stored before the codes (the QA report's examples)", () => {
    expect(clinicReasons(["quality: 3.1s of silence (max 3s)"], "flagged")).toEqual(["pause"]);
    expect(clinicReasons(["quality: no audio track"], "flagged")).toEqual(["audio"]);
    expect(clinicReasons(["quality: resolution 720x1280, expected 1080x1920"], "flagged")).toEqual(["technical"]);
    expect(clinicReasons(['hook removed — "Painless!": guarantee'], "flagged")).toEqual(["opening"]);
    expect(clinicReasons(['"whiter in one visit": promise → soften'], "flagged")).toEqual(["wording"]);
    expect(
      clinicReasons(['say each point once: "Zahnreinigung" repeats "…" — cut the repeat and keep the scene that says it best'], "rejected"),
    ).toEqual(["skipped"]);
  });

  it("falls back to a generic sentence, and hides technical markers", () => {
    expect(clinicReasons(["something new the worker says"], "flagged")).toEqual(["generic"]);
    expect(clinicReasons(["something new", "quality: 4.0s of silence (max 3s)"], "flagged")).toEqual(["pause"]);
    expect(clinicReasons(["the video file is missing"], "flagged")).toEqual([]);
    expect(clinicReasons(["could not produce: 429"], "rejected")).toEqual(["unavailable"]);
    expect(clinicReasons([], "rejected")).toEqual(["unavailable"]);
    expect(clinicReasons("nonsense", "flagged")).toEqual([]);
    expect(reasonCode("[dv:future] x", "flagged")).toBe("generic");
  });

  it("strips the code for the admin panel", () => {
    expect(findingText("[dv:pause] quality: 3.1s of silence (max 3s)")).toBe("quality: 3.1s of silence (max 3s)");
    expect(findingText("plain")).toBe("plain");
  });

  it.each(LOCALES)("%s: every reason has a sentence, without internal English", (l) => {
    for (const c of CLINIC_REASONS) {
      const s = REASON_TEXT[l][c];
      expect(s.length).toBeGreaterThan(5);
      expect(s).not.toMatch(/quality:|silence \(max|\[dv:|repeats/);
      if (l !== "en") expect(s).not.toBe(REASON_TEXT.en[c]);
    }
  });
});
