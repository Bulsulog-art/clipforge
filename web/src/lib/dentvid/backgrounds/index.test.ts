import { describe, it, expect } from "vitest";
import { chosenPhotoIds, cleanPhotoIds, withBackgrounds } from "./index";
import { photosFor } from "../items";

describe("photo helpers", () => {
  it("keeps known ids only, once each, at most four", () => {
    expect(cleanPhotoIds(["implants-03", "implants-03", "nope-01", 7, "whitening-02", "whitening-03", "whitening-04", "whitening-05"])).toEqual([
      "implants-03",
      "whitening-02",
      "whitening-03",
      "whitening-04",
    ]);
    expect(cleanPhotoIds("implants-03")).toEqual([]);
  });

  it("puts photos on a plan and takes them off again", () => {
    const plan = { title: "t", scenes: [] as unknown[] };
    const on = withBackgrounds(plan, ["implants-03"]);
    expect(on).toEqual({ ...plan, backgrounds: ["/dentvideo/backgrounds/implants-03.jpg"] });
    expect(chosenPhotoIds(on)).toEqual(["implants-03"]);
    expect("backgrounds" in withBackgrounds(on, [])).toBe(false);
  });
});

describe("photosFor (library card data)", () => {
  const plan = { title: "Zahnimplantat", scenes: [{ kind: "hook", text: "Ein Implantat aus Titan" }], backgrounds: ["/dentvideo/backgrounds/implants-07.jpg"] };

  it("uses stored suggestions, with the photos in use first", () => {
    const p = photosFor({ kind: "generated", plan, suggested_backgrounds: ["implants-03", "implants-07", "bogus-01"], restyle_status: "queued" })!;
    expect(p.suggested).toEqual(["implants-07", "implants-03"]);
    expect(p.chosen).toEqual(["implants-07"]);
    expect(p.status).toBe("queued");
  });

  it("computes suggestions for videos made before there were any", () => {
    const p = photosFor({ kind: "generated", plan, topic: { service: "Implantologie" } })!;
    expect(p.suggested.length).toBeGreaterThanOrEqual(10);
    expect(p.suggested[0]).toBe("implants-07");
  });

  it("offers nothing for recordings", () => {
    expect(photosFor({ kind: "recording", plan: null })).toBeUndefined();
  });
});
