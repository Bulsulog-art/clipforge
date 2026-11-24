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
import { CHANGE_INSTEAD_REASONS, DeclineForm, PostPanel, ReviewPanel, ReviewPlayer, askedHere, canAskChange, nextToDecide, postText, refreshOnClose } from "./review-player";
import { ChangeRequest } from "./clinic-requests";
import { POSTING_TEXT } from "@/content/dentvideo-posting";
import { REASON_TEXT } from "@/content/dentvideo-reasons";
import { REQUESTS_TEXT } from "@/content/dentvideo-requests";
import { REVIEW_TEXT } from "@/content/dentvideo-review";
import { DECLINE_REASONS } from "@/lib/dentvid/app-ui";

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
        clinicName="Sample Dental Practice"
        items={[item(), item(), item({ status: "flagged", reasons: ["wording"] }), item({ approval: "approved" }), item({ status: "working", videoUrl: undefined })]}
        canStartWeek={false}
        currentWeek={WEEK}
      />,
    );
    expect(h).toMatch(new RegExp(`<h1[^>]*>${esc(fmt(home.reviewMany, { n: 3 }))}</h1>`));
    expect(h).toContain("Sample Dental Practice");
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

/* ------------------------------------------------ fixing a video without losing it */

/** The interactive controls in DOM order, each by its accessible name (aria-label, else its text). */
function controls(h: string): string[] {
  const re = /<(button|a|summary|textarea)\b([^>]*)>([\s\S]*?)<\/\1>|<input\b([^>]*?)\/?>/g;
  return [...h.matchAll(re)].map((m) => {
    const attrs = m[2] ?? m[4] ?? "";
    const label = /aria-label="([^"]*)"/.exec(attrs)?.[1];
    const text = (m[3] ?? "").replace(/<[^>]+>/g, "").trim();
    return label ?? (text || /value="([^"]*)"/.exec(attrs)?.[1] || m[1] || "input");
  });
}

/** What a component renders, as React elements (its own hooks run inside a render), so a handler can be called. */
function treeOf(render: () => React.ReactNode): React.ReactNode {
  let out: React.ReactNode = null;
  function Spy() {
    out = render();
    return <>{out}</>;
  }
  renderToStaticMarkup(<Spy />);
  return out;
}
/**
 * A component's tree through a few steps, with its state kept from one step to the next: each step
 * gets the tree as rendered and may call its handlers or change what the render reads. A server
 * render takes state updates only while it renders, so the steps run inside it, and each one is
 * followed by a render of what it changed. Returns the last tree and the HTML it rendered to.
 */
function playThrough(render: () => React.ReactNode, steps: ((tree: React.ReactNode) => void)[]): { tree: React.ReactNode; html: string } {
  let out: React.ReactNode = null;
  let k = 0;
  function Spy() {
    const [, again] = React.useState(0);
    out = render();
    if (k < steps.length) {
      steps[k++](out);
      again((n) => n + 1);
    }
    return <>{out}</>;
  }
  const h = renderToStaticMarkup(<Spy />);
  expect(k, "every step ran").toBe(steps.length);
  return { tree: out, html: decode(h) };
}
type Props = { children?: React.ReactNode; onClick?: () => void; className?: string };
function textOf(n: React.ReactNode): string {
  if (typeof n === "string" || typeof n === "number") return String(n);
  if (Array.isArray(n)) return n.map(textOf).join("");
  return React.isValidElement(n) ? textOf((n.props as Props).children) : "";
}
function buttonsIn(n: React.ReactNode, out: React.ReactElement<Props>[] = []): React.ReactElement<Props>[] {
  if (Array.isArray(n)) n.forEach((c) => buttonsIn(c, out));
  else if (React.isValidElement<Props>(n)) {
    if (n.type === "button") out.push(n);
    buttonsIn(n.props.children, out);
  }
  return out;
}
const buttonNamed = (tree: React.ReactNode, name: string) => buttonsIn(tree).find((b) => textOf(b.props.children).includes(name));
/** Every element of a component type in a tree, also inside element props (PostPanel's `change`). */
function elementsOf<P>(n: unknown, type: unknown, out: React.ReactElement<P>[] = []): React.ReactElement<P>[] {
  if (Array.isArray(n)) n.forEach((c) => elementsOf(c, type, out));
  else if (React.isValidElement(n)) {
    if (n.type === type) out.push(n as React.ReactElement<P>);
    for (const v of Object.values(n.props as Record<string, unknown>)) elementsOf(v, type, out);
  }
  return out;
}
type ChangeProps = React.ComponentProps<typeof ChangeRequest>;
type DeclineProps = React.ComponentProps<typeof DeclineForm>;
type PanelProps = React.ComponentProps<typeof ReviewPanel>;
/** The button whose whole text is `name` ("Approve", not "Approve, save video + copy caption"). */
const buttonExactly = (tree: React.ReactNode, name: string) => buttonsIn(tree).find((b) => textOf(b.props.children).trim() === name);

/**
 * A fake share (useSaveAndCopy) in a given state: an "ok" note is what a successful save or share leaves.
 * `run` and `download` are bare mocks so the fake fits whatever they resolve to.
 */
const shareIn = (note: { kind: "ok" | "error"; text: string } | null) => ({ method: "download" as const, busy: false, again: false, note, run: vi.fn(), download: vi.fn() });

const photos = { suggested: ["a", "b"], chosen: [] as string[] };

describe("ask for a change inside the review player", () => {
  const panel = (l: Locale, it: LibraryItem, extra: Partial<React.ComponentProps<typeof ReviewPanel>> = {}) =>
    html(<ReviewPanel locale={l} item={it} queue={[it]} index={0} onIndex={() => {}} decide={noop} posted={false} onPosted={() => {}} {...extra} />);

  it.each(LOCALES)("%s: the open dialog offers it for review, look and approved videos with photos", (l: Locale) => {
    const ask = REQUESTS_TEXT[l].change.button;
    const t = APP_TEXT[l].library;
    for (const it of [item({ photos }), item({ photos, status: "flagged", reasons: ["pause"] }), item({ photos, approval: "approved" })]) {
      const h = html(<ReviewPlayer locale={l} queue={[it, item({ photos })]} index={0} onIndex={() => {}} onClose={() => {}} decide={noop} posted={{}} onPosted={() => {}} />);
      const c = controls(h);
      expect(c, it.approval).toContain(ask);
      expect(c).toContain(t.close);
      expect(c).toContain(t.review.next);
    }
  });

  it("in review it sits right under the Decline / Approve row; once approved, under the posted tick and before More options", () => {
    const t = APP_TEXT.en.library;
    const ask = REQUESTS_TEXT.en.change.button;
    const review = controls(panel("en", item({ photos })));
    expect(review.indexOf(ask)).toBe(review.indexOf(t.approve) + 1);
    expect(review.indexOf(t.decline)).toBe(review.indexOf(t.approve) - 1);
    const approved = controls(panel("en", item({ photos, approval: "approved" })));
    expect(approved.indexOf(ask)).toBeGreaterThan(approved.indexOf(t.post.markPosted));
    expect(approved.indexOf(ask)).toBeLessThan(approved.indexOf(REVIEW_TEXT.en.moreOptions));
  });

  it("is not offered without photos (a recording, an older video), while photos are being updated, while a change runs, or right after one was asked here", () => {
    const ask = REQUESTS_TEXT.en.change.button;
    const at = new Date().toISOString();
    const none = [
      item(),
      item({ kind: "recording", approval: "approved" }),
      item({ photos: { ...photos, status: "queued" } }),
      item({ photos, change: { status: "working", reason: null, at } }),
      item({ photos, change: { status: "queued", reason: null, at }, approval: "approved" }),
    ];
    for (const it of none) expect(controls(panel("en", it)), JSON.stringify(it.change ?? it.photos ?? it.kind)).not.toContain(ask);
    // Asked for a minute ago in this open player: it reads as requested, and cannot be asked twice.
    const h = panel("en", item({ photos }), { changeQueued: true });
    expect(controls(h)).not.toContain(ask);
    expect(h).toContain(REQUESTS_TEXT.en.change.status.queued);
  });

  it("a running change is named in the player, the way the card names it", () => {
    const h = panel("en", item({ photos, change: { status: "working", reason: null, at: new Date().toISOString() } }));
    expect(h).toContain(REQUESTS_TEXT.en.change.status.working);
  });

  it("uses exactly the library card's rule (same answer as the card, case by case)", () => {
    const at = new Date().toISOString();
    const cases: LibraryItem[] = [
      item({ photos }),
      item({ photos, status: "flagged", reasons: ["pause"] }),
      item({ photos, approval: "approved" }),
      item({ photos, approval: "rejected" }),
      item(),
      item({ photos, videoUrl: undefined }),
      item({ photos, status: "working", videoUrl: undefined }),
      item({ photos, status: "failed", videoUrl: undefined }),
      item({ photos: { ...photos, status: "queued" } }),
      item({ photos: { ...photos, status: "failed" } }),
      item({ photos, change: { status: "queued", reason: null, at } }),
      item({ photos, change: { status: "working", reason: null, at } }),
      item({ photos, change: { status: "done", reason: null, at } }),
      item({ photos, change: { status: "refused", reason: "checks", at } }),
      item({ photos, change: { status: "failed", reason: "technical", at } }),
    ];
    const ask = REQUESTS_TEXT.en.change.button;
    for (const it of cases) {
      const card = html(<Library locale="en" items={[it]} canStartWeek={false} currentWeek={WEEK} />).includes(ask);
      expect(canAskChange(it), JSON.stringify({ a: it.approval, s: it.status, p: it.photos?.status, c: it.change?.status, v: !!it.videoUrl })).toBe(card);
    }
    expect(cases.filter((c) => canAskChange(c)).length).toBeGreaterThan(3);
  });
});

describe("decline, or keep the video and ask for a change", () => {
  const f = APP_TEXT.en.library.declineForm;
  const rv = REVIEW_TEXT.en;
  const note = "The second sentence says three times a day. We say twice.";
  const offer = (l: Locale, onChoose: (reason: string, words: string) => void = () => {}) => ({ text: REVIEW_TEXT[l], onChoose });

  it.each(LOCALES)("%s: for 'wrong' and 'look' the first offer is a change that keeps the video; declining stays, as the second choice", (l: Locale) => {
    const t = APP_TEXT[l].library.declineForm;
    const r = REVIEW_TEXT[l];
    for (const reason of CHANGE_INSTEAD_REASONS) {
      const h = html(<DeclineForm t={t} busy={false} initial={{ reason, words: note }} onCancel={() => {}} onSubmit={() => {}} changeInstead={offer(l)} />);
      const c = controls(h);
      expect(c).toContain(r.changeInstead);
      expect(h).toContain(r.changeInsteadHint);
      // The change comes before the decline, and is the one primary button.
      expect(c.indexOf(r.changeInstead)).toBeLessThan(c.indexOf(t.submit));
      expect(h).toMatch(new RegExp(`class="dv-btn dv-btn-primary[^"]*"[^>]*>(<svg[\\s\\S]*?</svg>)?${r.changeInstead.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
      expect(h).toMatch(/<button type="submit"[^>]*class="dv-btn flex-1[^"]*dv-btn-secondary/);
      expect(h.match(/dv-btn-primary/g)).toHaveLength(1);
    }
  });

  it("the typed note is carried over, with the reason", () => {
    const onChoose = vi.fn();
    const onSubmit = vi.fn();
    const tree = treeOf(() => DeclineForm({ t: f, busy: false, initial: { reason: "wrong", words: note }, onCancel: () => {}, onSubmit, changeInstead: offer("en", onChoose) }));
    buttonNamed(tree, rv.changeInstead)!.props.onClick!();
    expect(onChoose).toHaveBeenCalledWith("wrong", note);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("is not offered for the other reasons, with no reason yet, or where the video cannot be changed (no handler: the library card, no photos)", () => {
    for (const reason of DECLINE_REASONS.filter((r) => !CHANGE_INSTEAD_REASONS.includes(r))) {
      const h = html(<DeclineForm t={f} busy={false} initial={{ reason, words: note }} onCancel={() => {}} onSubmit={() => {}} changeInstead={offer("en")} />);
      expect(h).not.toContain(rv.changeInstead);
      expect(h).toMatch(/<button type="submit"[^>]*class="dv-btn flex-1[^"]*dv-btn-primary/);
    }
    expect(html(<DeclineForm t={f} busy={false} onCancel={() => {}} onSubmit={() => {}} changeInstead={offer("en")} />)).not.toContain(rv.changeInstead);
    expect(html(<DeclineForm t={f} busy={false} initial={{ reason: "wrong", words: note }} onCancel={() => {}} onSubmit={() => {}} />)).not.toContain(rv.changeInstead);
  });

  it("reopened, the decline form keeps the chosen reason and the words", () => {
    const h = html(<DeclineForm t={f} busy={false} initial={{ reason: "look", words: note }} onCancel={() => {}} onSubmit={() => {}} />);
    expect(h).toMatch(/checked="" value="look"/);
    expect(h.match(/checked=""/g)).toHaveLength(1);
    expect(h).toContain(`>${note}</textarea>`);
  });

  it.each(LOCALES)("%s: the decline copy promises only what happens (the team has it, the next topics are planned with it), never an email, a reply or a date", (l: Locale) => {
    const t = APP_TEXT[l].library.declineForm;
    for (const s of [t.lead, REVIEW_TEXT[l].declined, REVIEW_TEXT[l].changeInstead, REVIEW_TEXT[l].changeInsteadHint]) {
      expect(s).not.toMatch(/mail|メール|بريد|correo|courriel|e-posta|reply|respond|antworten wir|responderemos|répondrons|yanıtlayacağız|odpowiemy|返信|سنرد/i);
      expect(s).not.toMatch(/[–—!]/);
    }
    // A decline on Sunday shapes the week after next (the week is planned on Saturday): no "next week".
    expect(t.lead).not.toMatch(/next week|nächsten Woche|próxima semana|gelecek hafta|semaine prochaine|翌週|来週|الأسبوع القادم|przyszły tydzień/i);
  });
});

describe("the post sheet: the posted tick in reach", () => {
  it.each(LOCALES)("%s: 'Mark as posted' and 'Next video' are the next controls after the save / share button", (l: Locale) => {
    const p = APP_TEXT[l].library.post;
    const ps = POSTING_TEXT[l];
    const a = item({ approval: "approved", photos, subtitles: true });
    const c = controls(html(<PostPanel locale={l} item={a} posted={false} onPosted={() => {}} slot="Tue 12:30" onNext={() => {}} />));
    const primary = c.indexOf(ps.downloadAndCopy);
    expect(primary).toBeGreaterThanOrEqual(0);
    expect(c[primary + 1]).toBe(p.markPosted);
    expect(c[primary + 2]).toContain(ps.nextVideo);
  });

  it.each(LOCALES)("%s: subtitles, the caption tabs and the app steps fold into 'More options'", (l: Locale) => {
    const p = { ...APP_TEXT[l].library.post, ...REVIEW_TEXT[l] };
    const a = item({ approval: "approved", subtitles: true });
    const h = html(<PostPanel locale={l} item={a} posted={false} onPosted={() => {}} />);
    const open = h.indexOf("<details");
    const close = h.indexOf("</details>");
    expect(open).toBeGreaterThan(h.indexOf(p.markPosted));
    expect(h.slice(open, close)).toMatch(new RegExp(`<summary[^>]*>${p.moreOptions.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
    const inside = h.slice(open, close);
    expect(inside).toContain(`/api/dentvideo/items/${a.id}/subtitles?format=srt`);
    expect(inside.match(/role="tab"/g)).toHaveLength(6);
    expect(inside).toContain(p.tipsTitle);
    expect(inside).toContain(p.format);
    // Folded until opened, and nothing of it before the tick.
    expect(h).not.toMatch(/<details[^>]*open/);
    expect(h.slice(0, open)).not.toContain('role="tab"');
  });

  it.each(LOCALES)("%s: after a successful save or share it asks 'Posted it?', and yes ticks it", (l: Locale) => {
    const p = { ...APP_TEXT[l].library.post, ...REVIEW_TEXT[l] };
    const ps = POSTING_TEXT[l];
    const a = item({ approval: "approved" });
    const share = shareIn({ kind: "ok", text: ps.downloadedHint });
    const h = html(<PostPanel locale={l} item={a} posted={false} onPosted={() => {}} share={share} />);
    expect(h).toContain(p.postedPrompt);
    const c = controls(h);
    expect(c[c.indexOf(ps.downloadAndCopy) + 1]).toBe(p.postedYes);
    expect(c).not.toContain(p.markPosted);
    // The question is the one primary now; the share button steps back.
    expect(h.match(/dv-btn-primary/g)).toHaveLength(1);
    const onPosted = vi.fn();
    const tree = treeOf(() => PostPanel({ locale: l, item: a, posted: false, onPosted, share }));
    buttonNamed(tree, p.postedYes)!.props.onClick!();
    expect(onPosted).toHaveBeenCalledWith(true);
  });

  it("no question before sharing, after a failed share, or once it is ticked", () => {
    const p = { ...APP_TEXT.en.library.post, ...REVIEW_TEXT.en };
    const a = item({ approval: "approved" });
    expect(html(<PostPanel locale="en" item={a} posted={false} onPosted={() => {}} share={shareIn(null)} />)).not.toContain(p.postedPrompt);
    expect(html(<PostPanel locale="en" item={a} posted={false} onPosted={() => {}} share={shareIn({ kind: "error", text: "no" })} />)).not.toContain(p.postedPrompt);
    const ticked = html(<PostPanel locale="en" item={a} posted onPosted={() => {}} share={shareIn({ kind: "ok", text: "ok" })} />);
    expect(ticked).not.toContain(p.postedPrompt);
    expect(ticked).toContain('aria-pressed="true"');
    // Before sharing the tick is a toggle that undoes too.
    const onPosted = vi.fn();
    buttonNamed(treeOf(() => PostPanel({ locale: "en", item: a, posted: true, onPosted, share: shareIn(null) })), p.posted)!.props.onClick!();
    expect(onPosted).toHaveBeenCalledWith(false);
  });
});

describe("while a change is asked for or being made, the old version is not decided on or posted", () => {
  const at = "2026-11-24T08:00:00.000Z";
  const t = APP_TEXT.en.library;
  const ps = POSTING_TEXT.en;
  const rq = REQUESTS_TEXT.en.change;
  const panel = (it: LibraryItem, extra: Partial<React.ComponentProps<typeof ReviewPanel>> = {}, l: Locale = "en") =>
    html(<ReviewPanel locale={l} item={it} queue={[it, item({ photos })]} index={0} onIndex={() => {}} decide={noop} posted={false} onPosted={() => {}} {...extra} />);
  const asked = { changeQueued: true };

  it.each(LOCALES)("%s: waiting for a decision, with a change asked here or running: no Approve, no Approve + save, no Decline, no second request", (l: Locale) => {
    const lt = APP_TEXT[l].library;
    const lp = POSTING_TEXT[l];
    const lrq = REQUESTS_TEXT[l].change;
    const cases: [LibraryItem, Partial<React.ComponentProps<typeof ReviewPanel>>, string][] = [
      [item({ photos }), asked, lrq.status.queued],
      [item({ photos, status: "flagged", reasons: ["pause"] }), asked, lrq.status.queued],
      [item({ photos, change: { status: "working", reason: null, at } }), {}, lrq.status.working],
      [item({ photos, status: "flagged", reasons: ["pause"], change: { status: "queued", reason: null, at } }), {}, lrq.status.queued],
    ];
    for (const [it, extra, status] of cases) {
      const h = panel(it, extra, l);
      const c = controls(h);
      for (const gone of [lt.approve, lt.decline, lp.approveSaveCopy, lrq.button, lrq.submit, lt.post.markPosted]) expect(c, `${it.status} ${it.change?.status}: ${gone}`).not.toContain(gone);
      // The chip names the change (not "Ready to approve", and not the card's "Updating photos").
      expect(h).toContain(status);
      for (const not of [lt.state.review, lt.state.look, lt.state.updating]) expect(h).not.toContain(`${not}</span>`);
      // What to check stays readable.
      if (it.reasons.length) expect(h).toContain(lt.whatToCheck);
    }
  });

  it.each(LOCALES)("%s: approved, with a change asked here or running: nothing to save, tick or undo, and the way to the next video", (l: Locale) => {
    const lt = APP_TEXT[l].library;
    const lp = POSTING_TEXT[l];
    const lrq = REQUESTS_TEXT[l].change;
    for (const [it, extra] of [
      [item({ photos, approval: "approved" }), asked],
      [item({ photos, approval: "approved", change: { status: "working", reason: null, at } }), {}],
    ] as const) {
      const c = controls(panel(it, extra, l));
      for (const gone of [lp.downloadAndCopy, lp.saveAndCopy, lt.post.markPosted, lt.post.posted, REVIEW_TEXT[l].postedYes, lt.undo, REVIEW_TEXT[l].moreOptions, lrq.button, lt.approve, lt.decline]) {
        expect(c, gone).not.toContain(gone);
      }
      expect(c.some((x) => x.includes(lp.nextVideo))).toBe(true);
    }
  });

  it("a declined video being changed cannot be taken back meanwhile; a photo update (no change) still posts as before", () => {
    const d = panel(item({ photos, approval: "rejected", change: { status: "working", reason: null, at } }));
    expect(controls(d)).not.toContain(t.undo);
    expect(d).toContain(rq.status.working);
    const restyled = controls(panel(item({ photos: { ...photos, status: "queued" }, approval: "approved" })));
    expect(restyled).toContain(ps.downloadAndCopy);
    expect(restyled).toContain(t.post.markPosted);
    expect(restyled).toContain(t.undo);
  });

  it("once a change is asked for here, no change request is rendered at all, so a note carried over from the decline form cannot reopen it", () => {
    for (const it of [item({ photos }), item({ photos, approval: "approved" }), item({ photos, status: "flagged", reasons: ["pause"] })]) {
      const tree = treeOf(() => ReviewPanel({ locale: "en", item: it, queue: [it], index: 0, onIndex: () => {}, decide: noop, posted: false, onPosted: () => {}, changeQueued: true }));
      expect(elementsOf(tree, ChangeRequest), it.approval).toHaveLength(0);
      // Without it, it is there (closed).
      const before = treeOf(() => ReviewPanel({ locale: "en", item: it, queue: [it], index: 0, onIndex: () => {}, decide: noop, posted: false, onPosted: () => {} }));
      expect(elementsOf<ChangeProps>(before, ChangeRequest).map((e) => !!e.props.startOpen)).toEqual([false]);
    }
  });

  it("once the library brings newer news of the change, that is what the player shows (made, or not made and why)", () => {
    const done = panel(item({ photos, change: { status: "done", reason: null, at } }));
    expect(done).toContain(rq.status.done);
    expect(controls(done)).toContain(t.approve);
    expect(controls(done)).toContain(t.decline);
    const refused = panel(item({ photos, approval: "approved", change: { status: "refused", reason: "checks", at } }));
    expect(refused).toContain(rq.reasons.checks);
    expect(controls(refused)).toContain(ps.downloadAndCopy);
  });
});

describe("what the player remembers about a change asked in it", () => {
  const at = "2026-11-24T08:00:00.000Z";

  it("a change asked here is shown from here until the library has a newer one for that video", () => {
    // Nothing asked here.
    expect(askedHere(item({}), undefined)).toBe(false);
    // Asked when the library showed no change, and it still shows none (it does not look while the player is open).
    expect(askedHere(item({}), null)).toBe(true);
    // Asked when the library showed an older outcome, which it still shows.
    expect(askedHere(item({ change: { status: "done", reason: null, at } }), at)).toBe(true);
    // The library now has the new change: requested, being made, made or refused. Its word counts.
    for (const status of ["queued", "working", "done", "refused", "failed"] as const) {
      expect(askedHere(item({ change: { status, reason: null, at: "2026-11-24T09:00:00.000Z" } }), at), status).toBe(false);
      expect(askedHere(item({ change: { status, reason: null, at } }), null), status).toBe(false);
    }
  });

  it("the library refreshes when the player closes, and only if a change was asked for in it", () => {
    const one = new Map([["i1", null]]);
    expect(refreshOnClose(false, one)).toBe(true);
    expect(refreshOnClose(true, one)).toBe(false);
    expect(refreshOnClose(false, new Map())).toBe(false);
    expect(refreshOnClose(true, new Map())).toBe(false);
  });
});

describe("sending a change from the player: the player hears of it only when the server took it", () => {
  const rq = REQUESTS_TEXT.en.change;
  const note = "Please say twice a day, not three times.";
  /** The panel's own change request, opened with a note, with fetch answering `respond`. */
  async function send(respond: () => Promise<Response>, it = item({ photos })) {
    const onChangeQueued = vi.fn();
    const fetchMock = vi.fn(respond);
    vi.stubGlobal("fetch", fetchMock);
    try {
      const tree = treeOf(() => ReviewPanel({ locale: "en", item: it, queue: [it], index: 0, onIndex: () => {}, decide: noop, posted: false, onPosted: () => {}, onChangeQueued }));
      const [el] = elementsOf<ChangeProps>(tree, ChangeRequest);
      const form = treeOf(() => ChangeRequest({ ...el.props, startOpen: true, initialNote: note }));
      const [f] = elementsOf<{ onSubmit: (e: { preventDefault: () => void }) => Promise<void> }>(form, "form");
      await f.props.onSubmit({ preventDefault: () => {} });
      return { onChangeQueued, fetchMock };
    } finally {
      vi.unstubAllGlobals();
    }
  }
  const json = (status: number, body: unknown) => async () => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

  it("accepted: one POST for this video with the note, and the player is told once (it refreshes the library on close)", async () => {
    const it = item({ photos });
    const { onChangeQueued, fetchMock } = await send(json(200, { ok: true, left: 2 }), it);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(`/api/dentvideo/items/${it.id}/change`);
    expect(init.method).toBe("POST");
    expect(JSON.parse(String(init.body))).toEqual({ note });
    expect(onChangeQueued).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["no changes left this week", json(429, { error: rq.errors.limit, code: "limit", left: 0 })],
    ["no active plan", json(402, { error: rq.reasons.no_plan, code: "no_plan" })],
    ["a change already being made", json(409, { error: rq.errors.busy, code: "busy" })],
    ["a server error", json(500, {})],
    ["no connection", async () => Promise.reject(new TypeError("offline"))],
  ])("refused (%s): nothing is marked as asked, so nothing is hidden and the library is not refreshed for it", async (_why, respond) => {
    const { onChangeQueued, fetchMock } = await send(respond as () => Promise<Response>);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(onChangeQueued).not.toHaveBeenCalled();
  });

  it("the panel's handlers: only an accepted change counts as asked; a refusal never does", () => {
    const onChangeQueued = vi.fn();
    const it = item({ photos });
    const tree = treeOf(() => ReviewPanel({ locale: "en", item: it, queue: [it], index: 0, onIndex: () => {}, decide: noop, posted: false, onPosted: () => {}, onChangeQueued }));
    const [el] = elementsOf<ChangeProps>(tree, ChangeRequest);
    for (const code of ["limit", "no_plan", "busy", "length", undefined]) el.props.onFailed!({ code, message: "No.", note });
    expect(onChangeQueued).not.toHaveBeenCalled();
    el.props.onQueued("Change requested. Changes left this week: 2 of 3");
    expect(onChangeQueued).toHaveBeenCalledTimes(1);
  });
});

describe("a cancelled 'Ask for a change instead' opens nothing by itself later", () => {
  const t = APP_TEXT.en.library;
  const rq = REQUESTS_TEXT.en.change;
  const note = "The second sentence says three times a day.";
  /**
   * The week's last video still waiting (so nothing moves on after a decision): Decline, "Something is
   * wrong", "Ask for a change instead", then Cancel in the change form; then `after`, each step a
   * change the library brings (the decision saved, taken back).
   */
  function cancelledHandOver(after: Partial<LibraryItem>[], more: ((tree: React.ReactNode) => void)[] = []) {
    let current = item({ photos });
    const opened: { startOpen: boolean; note?: string }[] = [];
    const out = playThrough(
      () => ReviewPanel({ locale: "en", item: current, queue: [current], index: 0, onIndex: () => {}, decide: noop, posted: false, onPosted: () => {} }),
      [
        (tree) => buttonExactly(tree, t.decline)!.props.onClick!(),
        (tree) => elementsOf<DeclineProps>(tree, DeclineForm)[0].props.changeInstead!.onChoose("wrong", note),
        (tree) => {
          const [form] = elementsOf<ChangeProps>(tree, ChangeRequest);
          opened.push({ startOpen: !!form.props.startOpen, note: form.props.initialNote });
          // The form reports itself open, then Cancel closes it.
          form.props.onOpenChange!(true);
          form.props.onOpenChange!(false);
        },
        ...more,
        ...after.map((over) => () => {
          current = { ...current, ...over };
        }),
      ],
    );
    return { ...out, opened };
  }

  it("the hand-over opens the change form, with the reason's words in it", () => {
    expect(cancelledHandOver([]).opened).toEqual([{ startOpen: true, note }]);
  });

  it("after Cancel and then Approve, the post step offers 'Ask for a change' closed: no open form, no old note to send", () => {
    const { tree, html: h } = cancelledHandOver([{ approval: "approved" }]);
    expect(elementsOf(tree, PostPanel)).toHaveLength(1);
    const forms = elementsOf<ChangeProps>(tree, ChangeRequest);
    expect(forms.map((f) => !!f.props.startOpen)).toEqual([false]);
    const c = controls(h);
    expect(c).toContain(APP_TEXT.en.library.post.markPosted);
    expect(c).toContain(rq.button);
    expect(c).not.toContain(rq.submit);
    expect(h).not.toContain("<textarea");
    expect(h).not.toContain(note);
  });

  it("after Cancel, a decline and Undo, Approve and Decline are back and the change form stays closed", () => {
    const { tree, html: h } = cancelledHandOver([{ approval: "rejected" }, { approval: "pending" }]);
    expect(elementsOf<ChangeProps>(tree, ChangeRequest).map((f) => !!f.props.startOpen)).toEqual([false]);
    const c = controls(h);
    expect(c).toContain(t.approve);
    expect(c).toContain(t.decline);
    expect(c).toContain(rq.button);
    expect(c).not.toContain(rq.submit);
    expect(h).not.toContain("<textarea");
  });

  it("after Cancel, Decline opens again with the reason and the words; choosing the change again opens it again", () => {
    let again: { startOpen: boolean; note?: string } | undefined;
    cancelledHandOver(
      [],
      [
        (tree) => buttonExactly(tree, t.decline)!.props.onClick!(),
        (tree) => {
          const [form] = elementsOf<DeclineProps>(tree, DeclineForm);
          expect(form.props.initial).toEqual({ reason: "wrong", words: note });
          form.props.changeInstead!.onChoose("wrong", `${note} Twice.`);
        },
        (tree) => {
          const [form] = elementsOf<ChangeProps>(tree, ChangeRequest);
          again = { startOpen: !!form.props.startOpen, note: form.props.initialNote };
        },
      ],
    );
    expect(again).toEqual({ startOpen: true, note: `${note} Twice.` });
  });
});

describe("after a decision the player moves on only to a video with something to decide", () => {
  const t = APP_TEXT.en.library;
  const at = "2026-11-24T08:00:00.000Z";

  it("nextToDecide passes over videos whose change is asked for or being made", () => {
    const a = item({ photos });
    const b = item({ photos, approval: "approved" });
    const c = item({ photos });
    const none = () => false;
    expect(nextToDecide([a, b, c], 1, none)).toBe(2);
    expect(nextToDecide([a, b, c], 2, none)).toBe(0);
    expect(nextToDecide([a, b, c], 1, (q) => q.id === c.id)).toBe(0);
    expect(nextToDecide([a, b, c], 1, (q) => q.id === a.id)).toBe(2);
    expect(nextToDecide([a, b, c], 1, (q) => q.id !== b.id)).toBe(-1);
    expect(nextToDecide([a, b], 1, (q) => q.id === a.id)).toBe(-1);
    // By default, a change the library shows running.
    expect(nextToDecide([item({ photos, change: { status: "working", reason: null, at } }), b], 1)).toBe(-1);
    expect(nextToDecide([item({ photos, change: { status: "done", reason: null, at } }), b], 1)).toBe(0);
    expect(nextToDecide([a, b], 1)).toBe(0);
    expect(nextToDecide([b], 0)).toBe(-1);
  });

  it("approving the other video does not jump back to the one whose change was just asked for", async () => {
    async function approveB(aBeingChanged: boolean) {
      const a = item({ photos });
      const b = item({ photos });
      const onIndex = vi.fn();
      const tree = treeOf(() =>
        ReviewPanel({ locale: "en", item: b, queue: [a, b], index: 1, onIndex, decide: noop, posted: false, onPosted: () => {}, beingChanged: (q) => aBeingChanged && q.id === a.id }),
      );
      vi.stubGlobal("window", { setTimeout: (f: () => void) => (f(), 0) });
      try {
        await (buttonExactly(tree, t.approve)!.props.onClick as () => Promise<void>)();
      } finally {
        vi.unstubAllGlobals();
      }
      return onIndex;
    }
    expect(await approveB(true)).not.toHaveBeenCalled();
    // The same tap moves on to a video that is waiting.
    expect(await approveB(false)).toHaveBeenCalledWith(0);
  });

  it("'Every video is decided' shows once the only other video waiting is being changed", () => {
    function approveAndShareB(aBeingChanged: boolean) {
      const a = item({ photos });
      let b = item({ photos });
      // The save waits for the file; the approval is what counts here.
      vi.stubGlobal("fetch", vi.fn(() => new Promise<Response>(() => {})));
      try {
        return playThrough(
          () => ReviewPanel({ locale: "en", item: b, queue: [a, b], index: 1, onIndex: () => {}, decide: noop, posted: false, onPosted: () => {}, beingChanged: (q) => aBeingChanged && q.id === a.id }),
          [
            (tree) => void buttonNamed(tree, POSTING_TEXT.en.approveSaveCopy)!.props.onClick!(),
            () => {
              b = { ...b, approval: "approved" };
            },
          ],
        ).html;
      } finally {
        vi.unstubAllGlobals();
      }
    }
    const done = approveAndShareB(true);
    expect(done).toContain(t.review.allDone);
    expect(controls(done)).toContain(t.post.markPosted);
    expect(approveAndShareB(false)).not.toContain(t.review.allDone);
  });

  it("the player tells each video which others are being changed (asked here, or running)", () => {
    const a = item({ photos });
    const b = item({ photos });
    const c = item({ photos, change: { status: "queued", reason: null, at } });
    let index = 0;
    const { tree } = playThrough(
      () => ReviewPlayer({ locale: "en", queue: [a, b, c], index, onIndex: () => {}, onClose: () => {}, decide: noop, posted: {}, onPosted: () => {} }),
      [
        (tree) => elementsOf<PanelProps>(tree, ReviewPanel)[0].props.onChangeQueued!(),
        () => {
          index = 1;
        },
      ],
    );
    const [panel] = elementsOf<PanelProps>(tree, ReviewPanel);
    expect(panel.props.item.id).toBe(b.id);
    expect([a, b, c].map((q) => panel.props.beingChanged!(q))).toEqual([true, false, true]);
  });
});

describe("no changes left this week is the clinic's, not one video's", () => {
  const t = APP_TEXT.en.library;
  const note = "Please say twice a day.";

  it("a video that hears 'no changes left' or 'no plan', or uses the week's last change, tells the player; other answers do not", () => {
    function heard(act: (el: React.ReactElement<ChangeProps>) => void): number {
      const onChangesOver = vi.fn();
      const it = item({ photos });
      const tree = treeOf(() => ReviewPanel({ locale: "en", item: it, queue: [it], index: 0, onIndex: () => {}, decide: noop, posted: false, onPosted: () => {}, onChangesOver }));
      act(elementsOf<ChangeProps>(tree, ChangeRequest)[0]);
      return onChangesOver.mock.calls.length;
    }
    for (const code of ["limit", "no_plan"]) expect(heard((el) => el.props.onFailed!({ code, message: "No.", note })), code).toBe(1);
    for (const code of ["busy", "length", "not_this", "unavailable", undefined]) expect(heard((el) => el.props.onFailed!({ code, message: "No.", note })), String(code)).toBe(0);
    expect(heard((el) => el.props.onQueued("Change requested. Changes left this week: 0 of 3", 0))).toBe(1);
    expect(heard((el) => el.props.onQueued("Change requested. Changes left this week: 2 of 3", 2))).toBe(0);
    expect(heard((el) => el.props.onQueued("Change requested."))).toBe(0);
  });

  it("the player passes it on to every other video while it is open", () => {
    const a = item({ photos });
    const b = item({ photos });
    let index = 0;
    const seen: boolean[] = [];
    const { tree } = playThrough(
      () => ReviewPlayer({ locale: "en", queue: [a, b], index, onIndex: () => {}, onClose: () => {}, decide: noop, posted: {}, onPosted: () => {} }),
      [
        (tree) => {
          const [p] = elementsOf<PanelProps>(tree, ReviewPanel);
          seen.push(!!p.props.changesOver);
          p.props.onChangesOver!();
        },
        () => {
          index = 1;
        },
      ],
    );
    const [panel] = elementsOf<PanelProps>(tree, ReviewPanel);
    expect(panel.props.item.id).toBe(b.id);
    expect(seen).toEqual([false]);
    expect(panel.props.changesOver).toBe(true);
  });

  it("a video told so offers no change: not under the decision, not in the decline form, not in the post step", () => {
    const it = item({ photos });
    let row = -1;
    const { tree } = playThrough(
      () => ReviewPanel({ locale: "en", item: it, queue: [it], index: 0, onIndex: () => {}, decide: noop, posted: false, onPosted: () => {}, changesOver: true }),
      [
        (tree) => {
          row = elementsOf(tree, ChangeRequest).length;
          buttonExactly(tree, t.decline)!.props.onClick!();
        },
      ],
    );
    expect(row).toBe(0);
    const [form] = elementsOf<DeclineProps>(tree, DeclineForm);
    expect(form.props.changeInstead).toBeUndefined();
    const a = item({ photos, approval: "approved" });
    const post = treeOf(() => ReviewPanel({ locale: "en", item: a, queue: [a], index: 0, onIndex: () => {}, decide: noop, posted: false, onPosted: () => {}, changesOver: true }));
    expect(elementsOf(post, ChangeRequest)).toHaveLength(0);
    // Without it, the same videos offer it.
    const before = treeOf(() => ReviewPanel({ locale: "en", item: a, queue: [a], index: 0, onIndex: () => {}, decide: noop, posted: false, onPosted: () => {} }));
    expect(elementsOf(before, ChangeRequest)).toHaveLength(1);
  });
});
