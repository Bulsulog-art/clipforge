import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: () => "/dentvideo/app",
  useRouter: () => ({ push: () => {}, replace: () => {}, refresh: () => {}, prefetch: () => {} }),
  useSearchParams: () => new URLSearchParams(),
}));

import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { LOCALES, type Locale } from "@/content/dentvideo";
import { APP_TEXT, fmt } from "@/content/dentvideo-app";
import { Library, NextStep, type LibraryItem } from "./library";
import { DeclineForm, PostPanel, ReviewPanel, postText } from "./review-player";

(globalThis as { React?: typeof React }).React = React;

const WEEK = "2026-11-09";
let seq = 0;
const item = (over: Partial<LibraryItem> = {}): LibraryItem => ({
  id: `i${++seq}`,
  kind: "generated",
  status: "ready",
  approval: "pending",
  title: "Bleeding gums",
  week_of: WEEK,
  caption: "Two minutes, twice a day.",
  hashtags: ["dentist", "brushing"],
  findings: [],
  videoUrl: "/v.mp4",
  thumbUrl: "/v.jpg",
  ...over,
});
const decode = (h: string) => h.replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
const html = (el: React.ReactElement) => decode(renderToStaticMarkup(el));
const noop = async () => true;

describe("the week's review", () => {
  it.each(LOCALES)("%s: the library offers to watch and approve, and approved cards lead to posting", (l: Locale) => {
    const t = APP_TEXT[l].library;
    const h = html(<Library locale={l} items={[item(), item(), item({ status: "flagged", findings: ["Check the claim"] }), item({ approval: "approved" })]} canStartWeek={false} currentWeek={WEEK} />);
    expect(h).toContain(t.review.start);
    expect(h).toContain(fmt(APP_TEXT[l].library.approveAll, { n: 2 }));
    expect(h).toContain(t.review.openPost);
    expect(h).toContain(t.whatToCheck);
    // The player is closed until a video is opened: no video element for it yet.
    expect(h).not.toContain("autoplay");
  });

  it.each(LOCALES)("%s: when everything is approved, the posting checklist shows the week's progress", (l: Locale) => {
    const t = APP_TEXT[l].library;
    const a = item({ approval: "approved" });
    const b = item({ approval: "approved" });
    const h = html(<NextStep locale={l} action="share" thisWeek={[a, b]} marks={{ [a.id]: WEEK }} currentWeek={WEEK} onReview={() => {}} onPost={() => {}} />);
    expect(h).toContain(fmt(t.post.progress, { n: 1, total: 2 }));
    expect(h).toContain(t.post.streakOne);
    expect(h).toContain(t.post.postNext);
    expect(h).toContain('role="progressbar"');
    expect(h).toContain('aria-valuenow="1"');
    expect(h).toContain(t.post.deviceNote);
  });

  it("says when every video of the week is posted, and counts a streak of weeks", () => {
    const t = APP_TEXT.en.library;
    const a = item({ approval: "approved" });
    const h = html(<NextStep locale="en" action="share" thisWeek={[a]} marks={{ [a.id]: WEEK, x: "2026-11-02", y: "2026-10-26" }} currentWeek={WEEK} onReview={() => {}} onPost={() => {}} />);
    expect(h).toContain(t.post.allPosted);
    expect(h).toContain(fmt(t.post.streak, { n: 3 }));
  });

  it.each(LOCALES)("%s: a video waiting for a decision shows approve and decline, with what to check", (l: Locale) => {
    const t = APP_TEXT[l].library;
    const it1 = item({ status: "flagged", findings: ["Says “whiter in one visit”"] });
    const h = html(<ReviewPanel locale={l} item={it1} queue={[it1]} index={0} onIndex={() => {}} decide={noop} posted={false} onPosted={() => {}} />);
    expect(h).toContain(t.approve);
    expect(h).toContain(t.decline);
    expect(h).toContain("Says “whiter in one visit”");
    expect(h).toContain(t.state.look);
  });

  it.each(LOCALES)("%s: an approved video turns into the post-it step", (l: Locale) => {
    const t = APP_TEXT[l].library;
    const a = item({ approval: "approved" });
    const h = html(<ReviewPanel locale={l} item={a} queue={[a]} index={0} onIndex={() => {}} decide={noop} posted onPosted={() => {}} />);
    expect(h).toContain(t.post.format);
    expect(h).toContain(t.post.posted);
    expect(h).toContain('aria-pressed="true"');
    expect(h).toContain(t.review.postedBadge);
    expect(h).not.toContain(`>${t.approve}<`);
  });

  it("a declined video can be taken back", () => {
    const d = item({ approval: "rejected" });
    const h = html(<ReviewPanel locale="en" item={d} queue={[d]} index={0} onIndex={() => {}} decide={noop} posted={false} onPosted={() => {}} />);
    expect(h).toContain(APP_TEXT.en.library.undo);
    expect(h).toContain(APP_TEXT.en.library.state.declined);
  });
});

describe("declining with a reason", () => {
  it.each(LOCALES)("%s: offers the four reasons as labelled radio buttons and a labelled note", (l: Locale) => {
    const f = APP_TEXT[l].library.declineForm;
    const h = html(<DeclineForm t={f} busy={false} onCancel={() => {}} onSubmit={() => {}} />);
    for (const r of Object.values(f.reasons)) expect(h).toContain(r);
    expect(h.match(/type="radio"/g)).toHaveLength(4);
    expect(h).toContain(`<legend class="font-semibold text-dv-ink">${f.title}</legend>`);
    expect(h).toMatch(/<label for="([^"]+)-note"[^>]*>/);
    expect(h).toContain('maxLength="400"');
    expect(h).toContain(f.submit);
    expect(h).toContain(f.cancel);
  });
});

describe("posting", () => {
  it.each(LOCALES)("%s: the caption and hashtags in the clinic's words, and steps for each app", (l: Locale) => {
    const p = APP_TEXT[l].library.post;
    const a = item({ approval: "approved", caption: "Zwei Minuten.", hashtags: ["zahnarzt"] });
    const h = html(<PostPanel locale={l} item={a} posted={false} onPosted={() => {}} />);
    expect(h).toContain("Zwei Minuten.\n\n#zahnarzt");
    expect(h).toContain(p.captionLabel);
    expect(h).toContain(p.markPosted);
    expect(h).toContain('aria-pressed="false"');
    for (const name of Object.values(p.platforms)) expect(h).toContain(name);
    expect(h.match(/role="tab"/g)).toHaveLength(4);
    expect(h).toContain('role="tabpanel"');
    // Instagram is open first.
    for (const step of p.tips.instagram) expect(h).toContain(step);
    // Without a share sheet (the server render), the button downloads and copies.
    expect(h).toContain(APP_TEXT[l].library.shareDesktop);
  });

  it("joins caption and hashtags the way they are pasted", () => {
    expect(postText({ caption: "Hi", hashtags: ["a", "b"] })).toBe("Hi\n\n#a #b");
    expect(postText({ caption: undefined, hashtags: ["a"] })).toBe("#a");
    expect(postText({})).toBe("");
  });
});

describe("the new words", () => {
  it.each(LOCALES)("%s: every tip is a full sentence and the WhatsApp tab names Status in the language", (l: Locale) => {
    const p = APP_TEXT[l].library.post;
    for (const steps of Object.values(p.tips)) {
      expect(steps).toHaveLength(3);
      for (const s of steps) expect(s.trim().length).toBeGreaterThan(5);
    }
    expect(p.platforms.whatsapp).toMatch(/WhatsApp|واتساب/);
  });
});
