import { describe, expect, it, vi } from "vitest";
import { APPROVE_TTL_DAYS, approveToken, approveUrl, handleApprove, verifyApproveToken, type ApproveItem, type ApproveStore } from "./approve-link";
import { unsubscribeToken, verifyUnsubscribeToken } from "./unsubscribe-token";
import { latestWeek } from "./ready-notice";

const CLINIC = "7d1c6a0e-3b2f-4e5d-9a8b-1c2d3e4f5a6b";
const WEEK = "2026-11-09";
const NOW = new Date("2026-11-09T07:00:00Z");

describe("approve token", () => {
  it("round-trips, is bound to clinic and week, and expires", () => {
    const t = approveToken(CLINIC, WEEK, "s", NOW);
    expect(verifyApproveToken(t, "s", NOW)).toEqual({ clinicId: CLINIC, week: WEEK });
    expect(verifyApproveToken(t, "other", NOW)).toBeNull();
    expect(verifyApproveToken(t.replace(WEEK, "2026-11-16"), "s", NOW)).toBeNull();
    expect(verifyApproveToken(t.replace(CLINIC, CLINIC.replace("7d1c", "8d1c")), "s", NOW)).toBeNull();
    const later = new Date(NOW.getTime() + (APPROVE_TTL_DAYS * 24 + 1) * 3600_000);
    expect(verifyApproveToken(t, "s", later)).toBeNull();
    expect(verifyApproveToken(null, "s")).toBeNull();
    expect(verifyApproveToken(t, null)).toBeNull();
  });

  it("an unsubscribe token can never approve, and an approve token never unsubscribes", () => {
    expect(verifyApproveToken(unsubscribeToken(CLINIC, "s"), "s", NOW)).toBeNull();
    expect(verifyUnsubscribeToken(approveToken(CLINIC, WEEK, "s", NOW), "s")).toBeNull();
  });

  it("links to dentvideo.com", () => {
    expect(approveUrl("https://dentvideo.com", CLINIC, WEEK, "s", NOW)).toMatch(/^https:\/\/dentvideo\.com\/api\/dentvideo\/approve\?t=/);
  });
});

function store(plan = "active", items: ApproveItem[] = [{ id: "a", title: "Brushing <basics>" }, { id: "b", title: "Whitening" }]) {
  const approved: string[] = [];
  const s: ApproveStore = {
    clinic: async () => ({ plan, language: "tr" }),
    pending: async () => items.filter((i) => !approved.includes(i.id)),
    approve: async (_c, _w, ids) => (approved.push(...ids), ids.length),
  };
  return { s, approved };
}

describe("approve page", () => {
  const url = (t: string) => `https://dentvideo.com/api/dentvideo/approve?t=${encodeURIComponent(t)}`;
  const deps = (s: ApproveStore, onApproved = vi.fn()) => ({ store: () => s, secret: "s", appUrl: "https://dentvideo.com/app", now: () => NOW, onApproved });

  it("GET changes nothing (mail scanners open links); POST approves the ready videos once", async () => {
    const { s, approved } = store();
    const t = approveToken(CLINIC, WEEK, "s", NOW);
    const get = await handleApprove({ method: "GET", url: url(t) }, deps(s));
    expect(get.status).toBe(200);
    expect(get.body).toContain('<form method="post"');
    expect(get.body).toContain("Brushing &lt;basics&gt;");
    expect(get.body).toContain('lang="tr"');
    expect(approved).toEqual([]);
    const onApproved = vi.fn();
    const post = await handleApprove({ method: "POST", url: url(t) }, deps(s, onApproved));
    expect(post.body).toContain("Onaylandı");
    expect(approved).toEqual(["a", "b"]);
    expect(onApproved).toHaveBeenCalledWith(CLINIC, 2);
    const again = await handleApprove({ method: "POST", url: url(t) }, deps(s));
    expect(again.body).toContain("Onaylanacak video kalmadı");
    expect(approved).toEqual(["a", "b"]);
  });

  it("refuses a bad or expired link, and a clinic that no longer pays", async () => {
    const { s, approved } = store("cancelled");
    expect((await handleApprove({ method: "POST", url: url("x.y"), language: "de" }, deps(s))).status).toBe(400);
    const t = approveToken(CLINIC, WEEK, "s", NOW);
    await handleApprove({ method: "POST", url: url(t) }, deps(s));
    expect(approved).toEqual([]);
    const expired = await handleApprove({ method: "GET", url: url(t), language: "en" }, { ...deps(store().s), now: () => new Date(NOW.getTime() + 11 * 86_400_000) });
    expect(expired.body).toContain("Approve links work for 10 days");
  });
});

describe("ready email: the latest finished week", () => {
  it("picks the newest week with ready or flagged videos", () => {
    const r = (id: string, week_of: string, status: string) => ({ id, title: id, week_of, thumb_path: `${id}.jpg`, status });
    const { week, items } = latestWeek([r("a", "2026-11-02", "ready"), r("b", "2026-11-09", "ready"), r("c", "2026-11-09", "flagged"), r("d", "2026-11-16", "queued")]);
    expect(week).toBe("2026-11-09");
    expect(items.map((i) => i.id)).toEqual(["b", "c"]);
  });
});
