import { describe, expect, it, vi } from "vitest";
import { onceInView } from "./seen";

type Cb = (entries: { isIntersecting: boolean }[]) => void;

/** A stand-in IntersectionObserver the test drives by hand. */
function fakeIO() {
  const made: { cb: Cb; opts: IntersectionObserverInit; observed: unknown[]; disconnected: boolean }[] = [];
  class IO {
    rec: (typeof made)[number];
    constructor(cb: Cb, opts: IntersectionObserverInit) {
      this.rec = { cb, opts, observed: [], disconnected: false };
      made.push(this.rec);
    }
    observe(el: unknown) {
      this.rec.observed.push(el);
    }
    disconnect() {
      this.rec.disconnected = true;
    }
  }
  return { IO: IO as unknown as typeof IntersectionObserver, made };
}

describe("onceInView (the landing's preview_seen)", () => {
  it("fires once, when the section enters the upper part of the screen, then stops watching", () => {
    const { IO, made } = fakeIO();
    const seen = vi.fn();
    const el = {} as Element;
    onceInView(el, seen, IO);
    expect(made).toHaveLength(1);
    expect(made[0].observed).toEqual([el]);
    // Only the bottom edge of the screen does not count.
    expect(made[0].opts.rootMargin).toBe("0px 0px -35% 0px");
    made[0].cb([{ isIntersecting: false }]);
    expect(seen).not.toHaveBeenCalled();
    made[0].cb([{ isIntersecting: true }]);
    expect(seen).toHaveBeenCalledTimes(1);
    expect(made[0].disconnected).toBe(true);
  });

  it("cleanup before it was seen: never fires", () => {
    const { IO, made } = fakeIO();
    const seen = vi.fn();
    const stop = onceInView({} as Element, seen, IO);
    stop();
    expect(made[0].disconnected).toBe(true);
    expect(seen).not.toHaveBeenCalled();
  });

  it("no element or no IntersectionObserver: nothing is counted, nothing throws", () => {
    const seen = vi.fn();
    expect(() => onceInView(null, seen, fakeIO().IO)()).not.toThrow();
    expect(() => onceInView({} as Element, seen, undefined)()).not.toThrow();
    expect(seen).not.toHaveBeenCalled();
  });

  it("a throwing callback never escapes", () => {
    const { IO, made } = fakeIO();
    onceInView({} as Element, () => {
      throw new Error("boom");
    }, IO);
    expect(() => made[0].cb([{ isIntersecting: true }])).not.toThrow();
  });
});
