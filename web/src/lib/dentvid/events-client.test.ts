import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { trackDv } from "./events-client";
import { INTERNAL_KEY } from "./internal-flag";

function memStore(init: Record<string, string> = {}) {
  const m = new Map(Object.entries(init));
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k) };
}

const sent: { url: string; body: { name: string; props: Record<string, unknown> } }[] = [];

beforeEach(() => {
  sent.length = 0;
  vi.stubGlobal("window", {});
  vi.stubGlobal("sessionStorage", memStore());
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init: { body: string }) => {
      sent.push({ url, body: JSON.parse(init.body) });
      return new Response(null, { status: 204 });
    }),
  );
});
afterEach(() => vi.unstubAllGlobals());

describe("browser events: internal traffic", () => {
  it("an internally flagged browser tags every event it sends", () => {
    vi.stubGlobal("localStorage", memStore({ [INTERNAL_KEY]: "1" }));
    trackDv("landing_view", { locale: "de" });
    trackDv("cta_clicked", { props: { where: "hero" } });
    expect(sent.map((s) => [s.body.name, s.body.props.internal])).toEqual([
      ["landing_view", true],
      ["cta_clicked", true],
    ]);
    expect(sent[0].url).toBe("/api/dentvideo/event");
  });

  it("an ordinary visitor's events carry no internal prop; a page cannot un-flag a flagged browser", () => {
    vi.stubGlobal("localStorage", memStore());
    trackDv("landing_view");
    expect(sent[0].body.props).not.toHaveProperty("internal");
    vi.stubGlobal("localStorage", memStore({ [INTERNAL_KEY]: "1" }));
    trackDv("plan_clicked", { props: { internal: false, tier: "starter" } as Record<string, string | boolean> });
    expect(sent[1].body.props.internal).toBe(true);
  });

  it("blocked storage still sends the event, untagged", () => {
    vi.stubGlobal("localStorage", {
      getItem: () => {
        throw new Error("SecurityError");
      },
    });
    trackDv("landing_view");
    expect(sent).toHaveLength(1);
    expect(sent[0].body.props).not.toHaveProperty("internal");
  });
});
