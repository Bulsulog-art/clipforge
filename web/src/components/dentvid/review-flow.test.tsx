import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: () => "/dentvideo/app",
  useRouter: () => ({ push: () => {}, replace: () => {}, refresh: () => {}, prefetch: () => {} }),
  useSearchParams: () => new URLSearchParams(),
}));

import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { LOCALES, type Locale } from "@/content/dentvideo";
import { APP_TEXT, countText, fmt } from "@/content/dentvideo-app";
import { Library, NextStep, type LibraryItem } from "./library";
import { DeclineForm, PostPanel, ReviewPanel, postText } from "./review-player";
import { POSTING_TEXT } from "@/content/dentvideo-posting";
import { REASON_TEXT } from "@/content/dentvideo-reasons";

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
  reasons: [],
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
    const h = html(<Library locale={l} items={[item(), item(), item({ status: "flagged", reasons: ["wording"] }), item({ approval: "approved" })]} canStartWeek={false} currentWeek={WEEK} />);
    expect(h).toContain(t.review.start);
    expect(h).toContain(countText(APP_TEXT[l].library.approveAll, 2, l));
    expect(h).toContain(t.review.openPost);
    expect(h).toContain(t.whatToCheck);
    // The player is closed until a video is opened: no video element for it yet.
    expect(h).not.toContain("autoplay");
  });

  it.each(LOCALES)("%s: a week that failed for good says so calmly and offers to try again; one being retried does not", (l: Locale) => {
    const h = APP_TEXT[l].home;
    const delayed = html(<Library locale={l} items={[]} canStartWeek={false} currentWeek={WEEK} weekDelay="delayed" />);
    expect(delayed).toContain(h.delayDelayed);
    expect(delayed).toContain(h.retryNow);
    const retrying = html(<Library locale={l} items={[]} canStartWeek={false} currentWeek={WEEK} weekDelay="retrying" />);
    expect(retrying).toContain(h.delayRetrying);
    expect(retrying).not.toContain(h.retryNow);
  });

  it.each(LOCALES)("%s: a paid week that delivered nothing usable (only rejected topics) offers to make it, not 'nothing to do'", (l: Locale) => {
    const h = APP_TEXT[l].home;
    const out = html(<Library locale={l} items={[item({ status: "rejected", videoUrl: undefined })]} canStartWeek currentWeek={WEEK} />);
    expect(out).toContain(h.startTitle);
    expect(out).toContain(APP_TEXT[l].library.makeWeek);
    expect(out).not.toContain(h.idleTitle);
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
    const it1 = item({ status: "flagged", reasons: ["pause"] });
    const h = html(<ReviewPanel locale={l} item={it1} queue={[it1]} index={0} onIndex={() => {}} decide={noop} posted={false} onPosted={() => {}} />);
    expect(h).toContain(t.approve);
    expect(h).toContain(t.decline);
    expect(h).toContain(REASON_TEXT[l].pause);
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
    const ps = POSTING_TEXT[l];
    const h = html(<PostPanel locale={l} item={a} posted={false} onPosted={() => {}} slot="Tue 12:30" />);
    expect(h).toContain("Zwei Minuten.\n\n#zahnarzt");
    expect(h).toContain(p.markPosted);
    expect(h).toContain('aria-pressed="false"');
    for (const name of Object.values(p.platforms)) expect(h).toContain(name);
    // Two caption tabs (Instagram, TikTok · Shorts) and four app-tip tabs.
    expect(h).toContain(ps.short);
    expect(h).toContain(ps.copy);
    expect(h.match(/role="tab"/g)).toHaveLength(6);
    expect(h).toContain('role="tabpanel"');
    // Instagram is open first.
    for (const step of p.tips.instagram) expect(h).toContain(step);
    // Without a share sheet (the server render), the button downloads and copies.
    expect(h).toContain(ps.downloadAndCopy);
    expect(h).toContain(ps.suggested.replace("{slot}", "Tue 12:30"));
  });

  it.each(LOCALES)("%s: a video waiting for approval offers approve + save + copy in one tap", (l: Locale) => {
    const r = item({ approval: "pending", caption: "Zwei Minuten.", hashtags: ["zahnarzt"] });
    const h = html(<ReviewPanel locale={l} item={r} queue={[r]} index={0} onIndex={() => {}} decide={noop} posted={false} onPosted={() => {}} slot="Tue 12:30" />);
    expect(h).toContain(POSTING_TEXT[l].approveSaveCopy);
    expect(h).toContain(APP_TEXT[l].library.approve);
    expect(h).toContain(POSTING_TEXT[l].suggested.replace("{slot}", "Tue 12:30"));
  });

  it("uses the worker's post kit when the video has one", () => {
    const k = item({ approval: "approved", caption: "c", hashtags: ["x"], post: { instagram: "IG text\n\n#a #b", short: "Short #a" } });
    expect(postText(k)).toBe("IG text\n\n#a #b");
    const h = html(<PostPanel locale="en" item={k} posted={false} onPosted={() => {}} />);
    expect(h).toContain("IG text");
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

describe("right-to-left", () => {
  it("play icons are never mirrored (media controls stay LTR), and content titles carry dir=auto", () => {
    const h = html(<Library locale="ar" items={[item({ title: "Tut Zahnreinigung weh?" }), item({ status: "flagged" })]} canStartWeek={false} currentWeek={WEEK} />);
    expect(h).not.toMatch(/lucide-play[^"]*"[^>]*rtl:-scale-x-100|rtl:-scale-x-100[^"]*"[^>]*lucide-play/);
    expect(h).not.toMatch(/<svg[^>]*class="[^"]*lucide-play[^"]*rtl:-scale-x-100/);
    expect(h).toContain("lucide-play");
    expect(h).toMatch(/<h3 dir="auto"[^>]*>Tut Zahnreinigung weh\?<\/h3>/);
  });
});

describe("reasons a clinic reads", () => {
  it.each(LOCALES)("%s: flagged and not-made items show the localized reason, never the raw note", (l: Locale) => {
    const h = html(
      <Library
        locale={l}
        items={[item({ status: "flagged", reasons: ["pause"] }), item({ status: "rejected", title: "Topic X", reasons: ["skipped"], videoUrl: undefined })]}
        canStartWeek={false}
        currentWeek={WEEK}
      />,
    );
    expect(h).toContain(REASON_TEXT[l].pause);
    expect(h).toContain(REASON_TEXT[l].skipped);
    expect(h).not.toMatch(/quality:|of silence|repeats/);
  });
});

describe("a calm home: one status, one action", () => {
  const LAST = "2026-11-02";
  const esc = (x: string) => x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  it.each(LOCALES)("%s: the hero is the page's heading, with the clinic, one progress line and no pill per state", (l: Locale) => {
    const home = APP_TEXT[l].home;
    const h = html(
      <Library
        locale={l}
        clinicName="Smile Studio"
        items={[item(), item(), item({ status: "flagged", reasons: ["wording"] }), item({ approval: "approved" }), item({ status: "working", videoUrl: undefined })]}
        canStartWeek={false}
        currentWeek={WEEK}
      />,
    );
    expect(h).toMatch(new RegExp(`<h1[^>]*>${esc(fmt(home.reviewMany, { n: 3 }))}</h1>`));
    expect(h).toContain("Smile Studio");
    expect(h).toContain(fmt(home.approvedOf, { n: 1, total: 5 }));
    expect(h.match(/<h1/g)).toHaveLength(1);
    // One primary button in the hero; "approve all" is the quiet option.
    const hero = h.slice(0, h.indexOf("</section>"));
    expect(hero.match(/dv-btn-primary/g)).toHaveLength(1);
    expect(hero).toContain(countText(APP_TEXT[l].library.approveAll, 2, l));
    expect(h).not.toMatch(/\{\w+\}/);
  });

  it("under the first-week card the hero steps down to h2", () => {
    const h = html(<Library locale="en" heroLevel={2} items={[item()]} canStartWeek={false} currentWeek={WEEK} />);
    expect(h).not.toContain("<h1");
    expect(h).toContain(`<h2 class="dv-display`);
  });

  it("older weeks fold into one line each; the newest week stays open", () => {
    const h = html(<Library locale="en" items={[item({ title: "This one" }), item({ week_of: LAST, approval: "approved", title: "Old one" })]} canStartWeek={false} currentWeek={WEEK} />);
    expect(h).toContain(APP_TEXT.en.library.review.title);
    // Last week is a closed disclosure (its cards are still there to open and post).
    expect(h).toMatch(/<details class="group\/week[^"]*"><summary[^>]*>.*Last week/s);
    expect(h).not.toMatch(/<details[^>]*open/);
    expect(h).toContain("Old one");
  });

  it("a card says nothing filler: no 'made for you', no posting time before approval, one disclosure for caption and photos", () => {
    const photos = { suggested: ["a", "b"], chosen: [] };
    const h = html(<Library locale="en" items={[item({ photos }), item({ kind: "recording" })]} canStartWeek={false} currentWeek={WEEK} />);
    const t = APP_TEXT.en.library;
    expect(h).not.toContain("Made for you");
    expect(h).toContain(t.fromRecording);
    expect(h).not.toContain("Best time");
    expect(h).toContain(`${t.captionAndHashtags} · ${t.photos.title}`);
  });

  it("a video still being made has no empty caption row", () => {
    const h = html(<Library locale="en" items={[item({ status: "working", videoUrl: undefined })]} canStartWeek={false} currentWeek={WEEK} />);
    expect(h).not.toContain(APP_TEXT.en.library.captionAndHashtags);
  });

  it.each(LOCALES)("%s: the caption can be read in the review before approving it", (l: Locale) => {
    const r = item({ approval: "pending", caption: "Zwei Minuten.", hashtags: ["zahnarzt"] });
    const h = html(<ReviewPanel locale={l} item={r} queue={[r]} index={0} onIndex={() => {}} decide={noop} posted={false} onPosted={() => {}} />);
    expect(h).toContain(APP_TEXT[l].library.captionAndHashtags);
    expect(h).toContain("Zwei Minuten.\n\n#zahnarzt");
  });
});

describe("the bulk approve button reads naturally for any count", () => {
  const label = (l: Locale, n: number) => countText(APP_TEXT[l].library.approveAll, n, l);
  it("English: one, both, all n", () => {
    expect(label("en", 1)).toBe("Approve video");
    expect(label("en", 2)).toBe("Approve both videos");
    expect(label("en", 5)).toBe("Approve all 5 videos");
  });
  it("Polish follows its plural rules (3-4 filmy, 5+ filmów, 22 filmy)", () => {
    expect(label("pl", 2)).toBe("Zatwierdź oba filmy");
    expect(label("pl", 3)).toBe("Zatwierdź wszystkie 3 filmy");
    expect(label("pl", 5)).toBe("Zatwierdź wszystkie 5 filmów");
    expect(label("pl", 22)).toBe("Zatwierdź wszystkie 22 filmy");
  });
  it.each(LOCALES)("%s: no leftover placeholder, no 'ready', and 1, 2 and many differ", (l: Locale) => {
    const [one, two, five] = [label(l, 1), label(l, 2), label(l, 5)];
    for (const s of [one, two, five]) expect(s).not.toMatch(/\{\w+\}/);
    expect(new Set([one, two, five]).size).toBe(3);
    expect(one).not.toMatch(/\d/);
    expect(five).toContain("5");
  });
});
