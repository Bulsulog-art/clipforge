import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * useSaveAndCopy's analytics switch. The review player (the app) keeps the
 * browser's video_shared event on every tap, as before (`track` defaults to
 * true); the email's post page turns it off and counts the share on the
 * server, with the clinic, once it went through.
 *
 * There is no DOM here: the hook is rendered on the server to get its
 * handle, then `run` / `download` are called with a stubbed browser.
 */

const tracked: [string, unknown][] = [];
vi.mock("@/lib/dentvid/events-client", () => ({
  trackDv: (name: string, opts: unknown) => void tracked.push([name, opts]),
  deviceKind: () => "mobile",
}));

import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { useSaveAndCopy } from "./share-kit";

(globalThis as { React?: typeof React }).React = React;

type Share = ReturnType<typeof useSaveAndCopy>;
const labels = { sharedHint: "s", downloadedHint: "d", failed: "f" };

function handle(track?: boolean): Share {
  let share: Share | null = null;
  function Probe() {
    share = useSaveAndCopy({ videoUrl: "https://liman.example/v.mp4", title: "Bleeding gums", text: "", ...(track === undefined ? {} : { track }), labels });
    return null;
  }
  renderToStaticMarkup(<Probe />);
  return share!;
}

const g = globalThis as Record<string, unknown>;
let saved: Record<string, unknown>;
let opened: string[];

beforeEach(() => {
  tracked.length = 0;
  opened = [];
  saved = { window: g.window, document: g.document, fetch: g.fetch };
  g.window = { setTimeout, clearTimeout, open: (u: string) => void opened.push(u) };
  g.document = { createElement: () => ({ click() {}, remove() {} }), body: { appendChild() {} } };
  g.fetch = vi.fn(async () => new Response(new Blob(["mp4"], { type: "video/mp4" })));
});
afterEach(() => {
  for (const [k, v] of Object.entries(saved)) g[k] = v;
});

describe("useSaveAndCopy: who counts the share", () => {
  it("by default (the review player) it sends the browser event on every tap, exactly as before", async () => {
    const share = handle();
    expect(await share.run()).toBe("download");
    await share.download();
    expect(tracked).toEqual([
      ["video_shared", { props: { method: "download" } }],
      ["video_shared", { props: { method: "download" } }],
    ]);
  });

  it("with track: false (the email's post page) it sends no browser event, and says what went through", async () => {
    const share = handle(false);
    expect(await share.run()).toBe("download");
    await share.download();
    expect(tracked).toEqual([]);
  });

  it("a download that failed resolves to null, so nothing is counted for it", async () => {
    g.fetch = vi.fn(async () => new Response("nope", { status: 403 }));
    expect(await handle(false).run()).toBeNull();
    expect(opened).toEqual(["https://liman.example/v.mp4"]);
  });

  it("runs the caller's step first, inside the tap", async () => {
    const order: string[] = [];
    g.fetch = vi.fn(async () => (order.push("fetch"), new Response(new Blob(["mp4"]))));
    await handle(false).run(() => order.push("approve"));
    expect(order).toEqual(["approve", "fetch"]);
  });
});

describe("the post page", () => {
  it("turns the browser event off and lets the server count it", async () => {
    const seen: { track?: boolean }[] = [];
    vi.resetModules();
    vi.doMock("./share-kit", async (orig) => {
      const real = await orig<typeof import("./share-kit")>();
      return { ...real, useSaveAndCopy: (args: Parameters<typeof real.useSaveAndCopy>[0]) => (seen.push(args), real.useSaveAndCopy(args)) };
    });
    vi.doMock("./clinic-requests", () => ({ SubtitlesFileButton: () => null }));
    const { PostNow } = await import("./post-now");
    const html = renderToStaticMarkup(
      <PostNow
        token="t"
        appUrl="/app"
        ttlDays={14}
        view={{ state: "ready", locale: "en", item: { id: "00000000-0000-4000-8000-000000000001", title: "T", videoUrl: "/v.mp4", approval: "approved", posted: false, texts: null } }}
      />,
    );
    expect(seen.map((a) => a.track)).toEqual([false]);
    // Nothing asks "Posted it?" before a share went through; the plain tick is there.
    expect(html).not.toContain("Posted it?");
    expect(html).toContain("Mark as posted");
    vi.doUnmock("./share-kit");
    vi.doUnmock("./clinic-requests");
  });
});

describe("the 'Posted it?' words", () => {
  it("exist in every language, written for it, with no dash as punctuation anywhere in the posting copy", async () => {
    const { POSTING_TEXT } = await import("@/content/dentvideo-posting");
    const { LOCALES } = await import("@/content/dentvideo");
    const { APP_TEXT } = await import("@/content/dentvideo-app");
    const flat = (o: object): string[] => Object.values(o).flatMap((v) => (typeof v === "string" ? [v] : flat(v)));
    for (const l of LOCALES) {
      const p = POSTING_TEXT[l].page;
      for (const s of [p.postedAsk, p.postedYes, p.postedDone]) expect(s.trim(), l).not.toBe("");
      if (l !== "en") for (const k of ["postedAsk", "postedYes", "postedDone"] as const) expect(p[k], `${l}.${k}`).not.toBe(POSTING_TEXT.en.page[k]);
      // The button says the same thing as the app's own tick.
      expect(p.postedYes.toLowerCase(), l).toContain(APP_TEXT[l].library.post.markPosted.toLowerCase());
      for (const s of flat(POSTING_TEXT[l])) expect(s, l).not.toMatch(/—| – /);
      expect(`${p.postedAsk}${p.postedYes}${p.postedDone}`, l).not.toContain("!");
    }
  });
});
