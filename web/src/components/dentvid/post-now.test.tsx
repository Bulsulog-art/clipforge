import { describe, expect, it, vi } from "vitest";

/**
 * The email's post page (post-now.tsx) around its one tap, with a stubbed
 * share kit and server: what it sends after a share or download, when it
 * asks "Posted it?", and what a failed tick looks like. The React wiring is
 * thin (postActions + postControls); share-kit.test.tsx renders the page.
 */

vi.mock("./clinic-requests", () => ({ SubtitlesFileButton: () => null }));

import { postActions, postCaller, postControls, type PostCall, type PostState } from "./post-now";
import type { ShareOutcome } from "./share-kit";
import { POSTING_TEXT } from "@/content/dentvideo-posting";

const FAILED = POSTING_TEXT.en.page.approveFailed;
type Action = "approve" | "posted" | "shared";

function page(over: Partial<PostState> = {}, opts: { outcome?: ShareOutcome; internal?: boolean } = {}) {
  let state: PostState = { approval: "approved", posted: false, asked: false, marked: false, error: null, ...over };
  const ok: Partial<Record<Action, boolean>> = {};
  const sent: [Action, Record<string, unknown>][] = [];
  const order: string[] = [];
  const call: PostCall = async (action, extra = {}) => {
    sent.push([action, extra]);
    order.push(action);
    return ok[action] ?? true;
  };
  const actions = postActions({
    get: () => state,
    set: (patch) => {
      state = { ...state, ...patch };
    },
    run: async (before) => {
      before?.();
      order.push("share sheet");
      return opts.outcome === undefined ? "share" : opts.outcome;
    },
    call,
    device: () => "mobile",
    internal: () => opts.internal ?? false,
    failed: FAILED,
  });
  return {
    actions,
    sent,
    order,
    ok,
    get state() {
      return state;
    },
    get controls() {
      return postControls(state);
    },
  };
}

/** Lets the approve call's answer land (it is not awaited by the tap: the share sheet opens in the same tap). */
const flush = () => new Promise((r) => setTimeout(r, 0));

describe("the post page's tap", () => {
  it("a cancelled or failed share sends nothing and asks nothing", async () => {
    const p = page({}, { outcome: null });
    expect(await p.actions.tap()).toBeNull();
    expect(p.sent).toEqual([]);
    expect(p.state.asked).toBe(false);
    expect(p.controls).toEqual({ ask: false, tick: true, done: false });
    // A pending video is still approved inside the tap, but nothing is counted or asked.
    const pending = page({ approval: "pending" }, { outcome: null });
    await pending.actions.tap();
    await flush();
    expect(pending.sent.map(([a]) => a)).toEqual(["approve"]);
    expect(pending.state).toMatchObject({ approval: "approved", asked: false, error: null });
    expect(pending.controls.ask).toBe(false);
  });

  it("a share that went through is counted with its method and device, then asks 'Posted it?' and hides the plain tick", async () => {
    const p = page();
    expect(await p.actions.tap()).toBe("share");
    expect(p.sent).toEqual([["shared", { method: "share", device: "mobile" }]]);
    expect(p.controls).toEqual({ ask: true, tick: false, done: false });
    const d = page({}, { outcome: "download" });
    expect(await d.actions.tap()).toBe("download");
    expect(d.sent).toEqual([["shared", { method: "download", device: "mobile" }]]);
    expect(d.controls.ask).toBe(true);
  });

  it("a browser flagged as ours says so, so the server keeps its share apart", async () => {
    const p = page({}, { internal: true });
    await p.actions.tap();
    expect(p.sent).toEqual([["shared", { method: "share", device: "mobile", internal: true }]]);
  });

  it("a pending video is approved first, inside the tap; a failed approval goes back to pending with the message and nothing asks", async () => {
    const p = page({ approval: "pending" });
    p.ok.approve = false;
    await p.actions.tap();
    expect(p.order.slice(0, 2)).toEqual(["approve", "share sheet"]);
    await flush();
    expect(p.state).toMatchObject({ approval: "pending", error: FAILED });
    // The tick needs an approved video: no "Posted it?" and no tick while it is pending.
    expect(p.controls).toEqual({ ask: false, tick: false, done: false });
  });

  it("nothing asks for a video that is already ticked", async () => {
    const p = page({ posted: true });
    await p.actions.tap();
    expect(p.controls).toEqual({ ask: false, tick: true, done: false });
  });
});

describe("'Posted it?' and the tick", () => {
  it("yes: the tick is stored, the thank-you shows, and the plain tick comes back pressed", async () => {
    const p = page();
    await p.actions.tap();
    await p.actions.yes();
    expect(p.sent.at(-1)).toEqual(["posted", { on: true }]);
    expect(p.state).toMatchObject({ posted: true, marked: true, error: null });
    expect(p.controls).toEqual({ ask: false, tick: true, done: true });
  });

  it("yes, when the server did not take it: 'That didn't save', the tick undone, and 'Posted it?' still there to try again", async () => {
    const p = page();
    await p.actions.tap();
    p.ok.posted = false;
    await p.actions.yes();
    expect(p.state).toMatchObject({ posted: false, marked: false, error: FAILED });
    expect(p.controls).toEqual({ ask: true, tick: false, done: false });
    p.ok.posted = true;
    await p.actions.yes();
    expect(p.state).toMatchObject({ posted: true, marked: true, error: null });
    expect(p.controls.done).toBe(true);
  });

  it("the plain tick toggles, and a failed one is undone with the message", async () => {
    const p = page();
    await p.actions.tick();
    expect(p.sent).toEqual([["posted", { on: true }]]);
    expect(p.state.posted).toBe(true);
    p.ok.posted = false;
    await p.actions.tick();
    expect(p.sent.at(-1)).toEqual(["posted", { on: false }]);
    expect(p.state).toMatchObject({ posted: true, error: FAILED });
    // The plain tick never shows the thank-you meant for "Posted it?".
    expect(p.controls.done).toBe(false);
  });
});

describe("the page's calls", () => {
  it("post the token, the video and the action as JSON, keepalive, and say whether the server took it", async () => {
    const seen: [string, RequestInit][] = [];
    let status = 200;
    const send = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      seen.push([String(url), init!]);
      return new Response("{}", { status });
    }) as unknown as typeof fetch;
    const call = postCaller("/api/dentvideo/post", "tok.en", "vid-1", send);
    expect(await call("shared", { method: "share", device: "mobile" })).toBe(true);
    const [url, init] = seen[0];
    expect(url).toBe("/api/dentvideo/post");
    expect(init).toMatchObject({ method: "POST", keepalive: true, headers: { "content-type": "application/json" } });
    expect(JSON.parse(String(init.body))).toEqual({ t: "tok.en", v: "vid-1", action: "shared", method: "share", device: "mobile" });
    status = 409;
    expect(await call("posted", { on: true })).toBe(false);
    const down = postCaller("/api/dentvideo/post", "t", "v", (async () => Promise.reject(new TypeError("offline"))) as unknown as typeof fetch);
    expect(await down("posted", { on: true })).toBe(false);
  });
});
