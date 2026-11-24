import { describe, expect, it, vi } from "vitest";
import { approveToken } from "./approve-link";
import { handlePostAction, loadPostView, postLinkUrl, shareOnceKey, type PostItem, type PostLinkStore, type ShareCounter } from "./post-link";
import { videoRows } from "./ready-notice";
import { readyEmail } from "./email";

const SECRET = "test-secret-0123456789";
const CLINIC = "11111111-1111-4111-8111-111111111111";
const OTHER = "22222222-2222-4222-8222-222222222222";
const WEEK = "2026-11-09";
const NOW = new Date("2026-11-09T08:00:00Z");
const id = (n: number) => `00000000-0000-4000-8000-00000000000${n}`;

function makeStore(over: Partial<{ plan: string; items: PostItem[]; postedMissing: boolean }> = {}) {
  const items: PostItem[] = over.items ?? [
    { id: id(1), title: "Brushing", kind: "generated", status: "ready", approval: "pending", week_of: WEEK, video_path: "o/1.mp4", thumb_path: "o/1.jpg", copy: { caption: "Brush twice a day.", hashtags: ["teeth"] }, posted_at: null },
    { id: id(2), title: "Whitening", kind: "generated", status: "flagged", approval: "pending", week_of: WEEK, video_path: "o/2.mp4", thumb_path: null, copy: null, posted_at: null },
    { id: id(3), title: "Aligners", kind: "generated", status: "ready", approval: "approved", week_of: WEEK, video_path: "o/3.mp4", thumb_path: null, copy: { post: { instagram: "IG", short: "S" } }, posted_at: null },
    { id: id(4), title: "Gums", kind: "generated", status: "ready", approval: "rejected", week_of: WEEK, video_path: "o/4.mp4", thumb_path: null, copy: null },
  ];
  const approve = vi.fn(async (_c: string, _w: string, i: string) => {
    const it = items.find((x) => x.id === i);
    if (!it || it.status !== "ready" || it.approval !== "pending") return false;
    it.approval = "approved";
    return true;
  });
  const store: PostLinkStore = {
    clinic: async (c) => (c === CLINIC ? { plan: over.plan ?? "active", language: "tr" } : null),
    week: async (c, w) => (c === CLINIC && w === WEEK ? items : []),
    approve,
    posted: async (_c, _w, i, on) => {
      if (over.postedMissing) return "missing";
      const it = items.find((x) => x.id === i);
      if (!it || it.approval !== "approved") return "none";
      it.posted_at = on ? NOW.toISOString() : null;
      return "ok";
    },
    signed: async (paths) => new Map(paths.map((p) => [p, `https://liman.example/${p}?sig=1`])),
  };
  return { store, items, approve };
}

const tok = (clinic = CLINIC, week = WEEK) => approveToken(clinic, week, SECRET, NOW);

describe("post link", () => {
  it("builds dentvideo.com/post?t=…&v=…", () => {
    const u = new URL(postLinkUrl("https://dentvideo.com/", CLINIC, WEEK, id(1), SECRET, NOW));
    expect(u.pathname).toBe("/post");
    expect(u.searchParams.get("v")).toBe(id(1));
    expect(u.searchParams.get("t")).toBe(tok());
  });

  it("GET shows a ready video with its caption and slot, and changes nothing", async () => {
    const { store, approve } = makeStore();
    const v = await loadPostView(tok(), id(1), { store, secret: SECRET, now: NOW });
    expect(v.state).toBe("ready");
    if (v.state !== "ready") return;
    expect(v.locale).toBe("tr");
    expect(v.item.videoUrl).toContain("o/1.mp4");
    expect(v.item.approval).toBe("pending");
    expect(v.item.texts?.instagram).toContain("#teeth");
    expect(v.item.slot).toMatch(/^Pzt 20:00$/);
    expect(approve).not.toHaveBeenCalled();
  });

  it("never shows a flagged, declined, unknown or other clinic's video, or one of a paused clinic", async () => {
    const { store } = makeStore();
    for (const v of [id(2), id(4), id(9)]) expect((await loadPostView(tok(), v, { store, secret: SECRET, now: NOW })).state).toBe("nothing");
    expect((await loadPostView(tok(OTHER), id(1), { store, secret: SECRET, now: NOW })).state).toBe("nothing");
    expect((await loadPostView(tok(CLINIC, "2026-11-02"), id(1), { store, secret: SECRET, now: NOW })).state).toBe("nothing");
    const paused = makeStore({ plan: "paused" }).store;
    expect((await loadPostView(tok(), id(1), { store: paused, secret: SECRET, now: NOW })).state).toBe("nothing");
  });

  it("rejects a bad, forged or expired token, and a malformed item id", async () => {
    const { store } = makeStore();
    expect((await loadPostView("nope", id(1), { store, secret: SECRET, now: NOW })).state).toBe("invalid");
    expect((await loadPostView(approveToken(CLINIC, WEEK, "other-secret", NOW), id(1), { store, secret: SECRET, now: NOW })).state).toBe("invalid");
    expect((await loadPostView(tok(), id(1), { store, secret: SECRET, now: new Date("2026-12-01T00:00:00Z") })).state).toBe("invalid");
    expect((await loadPostView(tok(), "1 or 1=1", { store, secret: SECRET, now: NOW })).state).toBe("invalid");
    expect((await loadPostView(tok(), id(1), { store, secret: null, now: NOW })).state).toBe("invalid");
  });

  it("POST approve approves exactly that ready, pending video — never a flagged one", async () => {
    const { store, items, approve } = makeStore();
    const onApproved = vi.fn();
    expect((await handlePostAction({ t: tok(), v: id(1), action: "approve" }, { store, secret: SECRET, now: NOW, onApproved })).status).toBe(200);
    expect(items[0].approval).toBe("approved");
    expect(items[1].approval).toBe("pending");
    expect(onApproved).toHaveBeenCalledWith(CLINIC);
    expect((await handlePostAction({ t: tok(), v: id(2), action: "approve" }, { store, secret: SECRET, now: NOW })).status).toBe(409);
    expect(items[1].approval).toBe("pending");
    // Approving an already approved video is a no-op that still lets the share go on.
    approve.mockClear();
    expect((await handlePostAction({ t: tok(), v: id(3), action: "approve" }, { store, secret: SECRET, now: NOW })).status).toBe(200);
    expect(approve).not.toHaveBeenCalled();
  });

  it("POST refuses bad tokens, unknown actions and inactive clinics", async () => {
    const { store, items } = makeStore();
    expect((await handlePostAction({ t: "x", v: id(1), action: "approve" }, { store, secret: SECRET, now: NOW })).status).toBe(400);
    expect((await handlePostAction({ t: tok(), v: id(1), action: "delete" }, { store, secret: SECRET, now: NOW })).status).toBe(400);
    expect((await handlePostAction({ t: tok(OTHER), v: id(1), action: "approve" }, { store, secret: SECRET, now: NOW })).status).toBe(409);
    expect(items[0].approval).toBe("pending");
    const paused = makeStore({ plan: "cancelled" });
    expect((await handlePostAction({ t: tok(), v: id(1), action: "approve" }, { store: paused.store, secret: SECRET, now: NOW })).status).toBe(409);
    expect(paused.items[0].approval).toBe("pending");
  });

  it("POST posted ticks only approved videos, and says when 0012 is not applied", async () => {
    const { store, items } = makeStore();
    expect((await handlePostAction({ t: tok(), v: id(3), action: "posted" }, { store, secret: SECRET, now: NOW })).body).toEqual({ ok: true, stored: true });
    expect(items[2].posted_at).toBeTruthy();
    expect((await handlePostAction({ t: tok(), v: id(1), action: "posted" }, { store, secret: SECRET, now: NOW })).status).toBe(409);
    const missing = makeStore({ postedMissing: true });
    expect((await handlePostAction({ t: tok(), v: id(3), action: "posted" }, { store: missing.store, secret: SECRET, now: NOW })).body).toEqual({ ok: true, stored: false });
  });
});

/** The route's share counter in memory: a once-only key per video, and the events it stored. */
function shares(opts: { recordOk?: boolean } = {}) {
  const keys = new Set<string>();
  const events: Parameters<ShareCounter["record"]>[0][] = [];
  const counter: ShareCounter = {
    claim: async (itemId) => (keys.has(shareOnceKey(itemId)) ? false : (keys.add(shareOnceKey(itemId)), true)),
    release: async (itemId) => void keys.delete(shareOnceKey(itemId)),
    record: async (e) => {
      if (opts.recordOk === false) return false;
      events.push(e);
      return true;
    },
  };
  return { counter, keys, events };
}

describe("post link: a share from the page counts, with the clinic, once per video", () => {
  const shared = (body: Record<string, unknown>, store: PostLinkStore, counter: ShareCounter, now = NOW) =>
    handlePostAction({ action: "shared", method: "share", ...body }, { store, secret: SECRET, now, shares: counter });

  it("records one video_shared with the token's clinic for a ready video of that clinic and week, once per video", async () => {
    const { store } = makeStore();
    const sh = shares();
    expect(await shared({ t: tok(), v: id(1), device: "mobile" }, store, sh.counter)).toEqual({ status: 200, body: { ok: true, stored: true } });
    expect(sh.events).toEqual([{ clinicId: CLINIC, method: "share", locale: "tr", device: "mobile" }]);
    // The same video again (another tap, a second download, a replayed request): counted once.
    expect(await shared({ t: tok(), v: id(1), method: "download" }, store, sh.counter)).toEqual({ status: 200, body: { ok: true, stored: false } });
    expect(await shared({ t: tok(), v: id(1).toUpperCase() }, store, sh.counter)).toEqual({ status: 200, body: { ok: true, stored: false } });
    // Another video of the week counts on its own; an approved one too.
    expect((await shared({ t: tok(), v: id(3), method: "download", device: "laptop" }, store, sh.counter)).body.stored).toBe(true);
    expect(sh.events).toHaveLength(2);
    expect(sh.events[1]).toEqual({ clinicId: CLINIC, method: "download", locale: "tr", device: undefined });
  });

  it("needs the right clinic, week and video: another clinic's token, another week, a flagged, declined or unknown video count nothing", async () => {
    const { store } = makeStore();
    const sh = shares();
    expect((await shared({ t: tok(OTHER), v: id(1) }, store, sh.counter)).status).toBe(409);
    expect((await shared({ t: tok(CLINIC, "2026-11-02"), v: id(1) }, store, sh.counter)).status).toBe(409);
    for (const v of [id(2), id(4), id(9)]) expect((await shared({ t: tok(), v }, store, sh.counter)).status, v).toBe(409);
    expect(sh.events).toEqual([]);
    expect(sh.keys.size).toBe(0);
  });

  it("rejects an expired, forged or missing token, a malformed video id and an unknown method", async () => {
    const { store } = makeStore();
    const sh = shares();
    expect((await shared({ t: tok(), v: id(1) }, store, sh.counter, new Date("2026-12-01T00:00:00Z"))).status).toBe(400);
    expect((await shared({ t: approveToken(CLINIC, WEEK, "other-secret", NOW), v: id(1) }, store, sh.counter)).status).toBe(400);
    const [c, w, exp, sig] = tok().split(".");
    expect((await shared({ t: [c, w, String(Number(exp) + 86_400), sig].join("."), v: id(1) }, store, sh.counter)).status).toBe(400);
    expect((await shared({ v: id(1) }, store, sh.counter)).status).toBe(400);
    expect((await shared({ t: tok(), v: "1 or 1=1" }, store, sh.counter)).status).toBe(400);
    expect((await shared({ t: tok(), v: id(1), method: "post" }, store, sh.counter)).body).toEqual({ ok: false, error: "method" });
    expect((await shared({ t: tok(), v: id(1), method: undefined }, store, sh.counter)).status).toBe(400);
    expect(sh.events).toEqual([]);
  });

  it("a paused or cancelled clinic counts nothing", async () => {
    const sh = shares();
    for (const plan of ["paused", "cancelled", "trial"]) expect((await shared({ t: tok(), v: id(1) }, makeStore({ plan }).store, sh.counter)).status, plan).toBe(409);
    expect(sh.events).toEqual([]);
  });

  it("when the event is not stored, the video's key is freed so a later tap still counts", async () => {
    const { store } = makeStore();
    const down = shares({ recordOk: false });
    expect((await shared({ t: tok(), v: id(1) }, store, down.counter)).body).toEqual({ ok: true, stored: false });
    expect(down.keys.size).toBe(0);
    // A claim store that throws does not block the count (Redis down: the route falls back to memory).
    const events: unknown[] = [];
    const flaky: ShareCounter = { claim: async () => Promise.reject(new Error("redis down")), release: async () => {}, record: async (e) => (events.push(e), true) };
    expect((await shared({ t: tok(), v: id(1) }, store, flaky)).body.stored).toBe(true);
    expect(events).toHaveLength(1);
  });

  it("does not approve, tick or change the video", async () => {
    const { store, items, approve } = makeStore();
    await shared({ t: tok(), v: id(1) }, store, shares().counter);
    expect(approve).not.toHaveBeenCalled();
    expect(items[0]).toMatchObject({ approval: "pending", posted_at: null });
  });
});

describe("ready email: the week's videos", () => {
  const items = [
    { id: id(1), title: "Brushing", week_of: WEEK, thumb_path: "o/1.jpg", status: "ready", approval: "pending", copy: { post: { instagram: "Brush twice a day. More.\n\nInvite\n\n#a", short: "s" } } },
    { id: id(2), title: "Whitening", week_of: WEEK, thumb_path: null, status: "flagged", approval: "pending", copy: null },
    { id: id(3), title: "Aligners", week_of: WEEK, thumb_path: null, status: "ready", approval: "approved", copy: { caption: "Clean them daily." } },
  ];
  const rows = videoRows(items, { week: WEEK, language: "en", base: "https://dentvideo.com", clinicId: CLINIC, secret: SECRET, thumbUrl: (p) => `https://liman.example/${p}`, now: NOW });

  it("one row per video: poster, caption preview, posting day and its own link", () => {
    expect(rows).toHaveLength(3);
    expect(rows[0]).toMatchObject({ title: "Brushing", thumbUrl: "https://liman.example/o/1.jpg", caption: "Brush twice a day.", slot: "Post Mon 19:00", action: "Approve & share" });
    expect(new URL(rows[0].href).pathname).toBe("/post");
    // Flagged: never a one-tap link — the dentist looks in the app first.
    expect(rows[1]).toMatchObject({ action: "Check it in the app", href: "https://dentvideo.com/app" });
    expect(rows[2]).toMatchObject({ action: "Save & share", caption: "Clean them daily." });
  });

  it("without the signing secret every row goes to the app", () => {
    const r = videoRows(items, { week: WEEK, language: "en", base: "https://dentvideo.com", clinicId: CLINIC, secret: null, thumbUrl: () => undefined, now: NOW });
    expect(r.every((x) => x.href === "https://dentvideo.com/app")).toBe(true);
  });

  it("renders in the email (HTML and plain text), in place of the poster grid; RTL for Arabic", () => {
    const m = readyEmail({ kind: "week", counts: { ready: 2, flagged: 1 }, clinicName: "C", language: "en", appUrl: "https://dentvideo.com/app", videos: rows, thumbs: [{ url: "https://x/y.jpg", title: "T", href: "https://dentvideo.com/app" }] })!;
    expect(m.html).toContain("Approve &amp; share");
    expect(m.html).toContain("Brush twice a day.");
    expect(m.html).not.toContain('class="dv-thumb"');
    expect(m.text).toContain("Approve & share: https://dentvideo.com/post?t=");
    const ar = readyEmail({ kind: "week", counts: { ready: 2, flagged: 1 }, clinicName: "C", language: "ar", appUrl: "https://dentvideo.com/app", videos: videoRows(items, { week: WEEK, language: "ar", base: "https://dentvideo.com", clinicId: CLINIC, secret: SECRET, thumbUrl: () => undefined, now: NOW }) })!;
    expect(ar.html).toContain('dir="rtl"');
    expect(ar.html).toContain("اعتماد ومشاركة");
  });
});
