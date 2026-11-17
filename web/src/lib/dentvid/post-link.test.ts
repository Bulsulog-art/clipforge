import { describe, expect, it, vi } from "vitest";
import { approveToken } from "./approve-link";
import { handlePostAction, loadPostView, postLinkUrl, type PostItem, type PostLinkStore } from "./post-link";
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
