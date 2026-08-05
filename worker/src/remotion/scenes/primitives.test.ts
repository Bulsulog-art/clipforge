import { describe, it, expect } from "vitest";
import { guardWidow } from "./primitives.js";

/**
 * The widow guard decides where a headline is allowed to break. It is tested
 * on its own because the failure it prevents — one short word alone on the
 * last line — is only visible in a rendered frame, which no test watches.
 */

const texts = (words: string[]) => guardWidow(words).map((i) => i.text);

describe("gluing the last line", () => {
  it("keeps a short final word with the one before it", () => {
    // "…day before you / are" is the break this exists to stop.
    const words = "Your morning is deciding your day before you are".split(" ");
    expect(texts(words).at(-1)).toBe("you are");
  });

  it("leaves everything before the last pair alone", () => {
    const words = "one two three four five".split(" ");
    expect(texts(words)).toEqual(["one", "two", "three", "four five"]);
  });

  it("does not glue a pair wide enough to overflow the frame", () => {
    const words = "Stop overthinking your extraordinary positioning".split(" ");
    expect(texts(words).at(-1)).toBe("positioning");
  });

  it("leaves two-word and one-word headlines untouched", () => {
    expect(texts(["Stop", "scrolling"])).toEqual(["Stop", "scrolling"]);
    expect(texts(["Now"])).toEqual(["Now"]);
  });
});

describe("animation indexes", () => {
  it("gives the glued pair the earlier word's index, so it never appears late", () => {
    const words = "one two three four five".split(" ");
    const items = guardWidow(words);
    expect(items.at(-1)).toEqual({ text: "four five", index: 3 });
  });

  it("keeps indexes aligned with the original words when nothing is glued", () => {
    // "delta extraordinary" is past the guard width, so no pair is formed and
    // every word keeps its own index.
    const words = "alpha beta gamma delta extraordinary".split(" ");
    expect(guardWidow(words).map((i) => i.index)).toEqual([0, 1, 2, 3, 4]);
  });
});
