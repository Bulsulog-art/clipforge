import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: () => "/dentvideo/app",
  useRouter: () => ({ push: () => {}, replace: () => {}, refresh: () => {}, prefetch: () => {} }),
  useSearchParams: () => new URLSearchParams(),
}));

import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { LOCALES, type Locale } from "@/content/dentvideo";
import { APP_TEXT } from "@/content/dentvideo-app";
import { CHECKED_TEXT, fillChecked } from "@/content/dentvideo-checked";
import { REVIEW_TEXT } from "@/content/dentvideo-review";
import { REQUESTS_TEXT } from "@/content/dentvideo-requests";
import { ItemCard, Library, type LibraryItem } from "./library";
import { DeclineForm, ReviewPanel } from "./review-player";
import { ChangeRequest } from "./clinic-requests";
import { CheckedLine, ScriptText, checkedParts, clock } from "./video-checks";
import { countryName } from "@/lib/dentvid/rule-countries";

(globalThis as { React?: typeof React }).React = React;

/**
 * Showing the work: the quiet "Software-checked" line on cards and in the
 * review, the "Script and caption" fold with times to play from and the
 * sentence a check marked, and "Ask for a change instead" on the library
 * card's decline form (the review player's hand-over, reused).
 */

const WEEK = "2026-11-23";
let seq = 0;
const item = (over: Partial<LibraryItem> = {}): LibraryItem => ({
  id: `c${++seq}`,
  kind: "generated",
  status: "ready",
  approval: "pending",
  title: "Bleeding gums",
  week_of: WEEK,
  caption: "Two minutes, twice a day.",
  hashtags: ["dentist"],
  reasons: [],
  videoUrl: "/v.mp4",
  thumbUrl: "/v.jpg",
  checked: { picture: true },
  ...over,
});
const photos = { suggested: ["a", "b"], chosen: [] as string[] };
const decode = (h: string) => h.replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
const html = (el: React.ReactElement) => decode(renderToStaticMarkup(el));
const noop = async () => true;
const card = (l: Locale, it: LibraryItem, country: string | null = "DE") =>
  html(<ItemCard item={it} t={APP_TEXT[l].library} posted={false} locale={l} decide={noop} onChanged={() => {}} onOpen={() => {}} country={country} />);
const panel = (l: Locale, it: LibraryItem, extra: Partial<React.ComponentProps<typeof ReviewPanel>> = {}) =>
  html(<ReviewPanel locale={l} item={it} queue={[it]} index={0} onIndex={() => {}} decide={noop} posted={false} onPosted={() => {}} country="DE" {...extra} />);
const lineCount = (h: string) => (h.match(/data-checked-line/g) ?? []).length;

/* -------------------------------------------------------------- helpers to call handlers */

function treeOf(render: () => React.ReactNode): React.ReactNode {
  let out: React.ReactNode = null;
  function Spy() {
    out = render();
    return <>{out}</>;
  }
  renderToStaticMarkup(<Spy />);
  return out;
}
/** A component through a few steps, state kept between them (see review-flow.test.tsx playThrough). */
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
type Props = { children?: React.ReactNode; onClick?: () => void };
function textOf(n: React.ReactNode): string {
  if (typeof n === "string" || typeof n === "number") return String(n);
  if (Array.isArray(n)) return n.map(textOf).join("");
  return React.isValidElement(n) ? textOf((n.props as Props).children) : "";
}
function elementsOf<P>(n: unknown, type: unknown, out: React.ReactElement<P>[] = []): React.ReactElement<P>[] {
  if (Array.isArray(n)) n.forEach((c) => elementsOf(c, type, out));
  else if (React.isValidElement(n)) {
    if (n.type === type) out.push(n as React.ReactElement<P>);
    for (const v of Object.values(n.props as Record<string, unknown>)) elementsOf(v, type, out);
  }
  return out;
}
const buttonExactly = (tree: React.ReactNode, name: string) => elementsOf<Props>(tree, "button").find((b) => textOf(b.props.children).trim() === name);
type ChangeProps = React.ComponentProps<typeof ChangeRequest>;
type DeclineProps = React.ComponentProps<typeof DeclineForm>;
type CardProps = React.ComponentProps<typeof ItemCard>;
const cardProps = (it: LibraryItem, over: Partial<CardProps> = {}): CardProps => ({
  item: it,
  t: APP_TEXT.en.library,
  posted: false,
  locale: "en",
  decide: noop,
  onChanged: () => {},
  onOpen: () => {},
  ...over,
});

/* ------------------------------------------------------------------ the line */

describe("the 'checked' line says only what was checked", () => {
  it.each(LOCALES)("%s: a ready video names clinical accuracy, the clinic's own country's advertising rules, and picture and sound, and links to how we check", (l: Locale) => {
    const c = CHECKED_TEXT[l];
    const h = card(l, item());
    expect(lineCount(h)).toBe(1);
    const parts = [c.accuracy, fillChecked(c.adsIn, { country: countryName(l, "DE") }), c.picture];
    expect(h).toContain(fillChecked(c.line, { parts: parts.join(c.sep) }));
    expect(h).toContain(`#how-we-check"`);
    expect(h).toContain(`>${c.how}</a>`);
    expect(h).toMatch(/href="[^"]*#how-we-check"[^>]*target="_blank"/);
  });

  it("a country whose own rules the reviewer does not have reads 'general advertising rules', never its name", () => {
    expect(checkedParts("en", { picture: true }, "FR")).toEqual(["clinical accuracy", "general advertising rules", "picture and sound"]);
    expect(checkedParts("en", { picture: true }, null)).toEqual(["clinical accuracy", "general advertising rules", "picture and sound"]);
    expect(checkedParts("de", { picture: false }, "uk")).toEqual(["fachliche Richtigkeit", "Werberegeln (Vereinigtes Königreich)"]);
    expect(checkedParts("tr", { picture: true }, "TR")).toEqual(["klinik doğruluk", "reklam kuralları (Türkiye)", "görüntü ve ses"]);
    const fr = card("fr", item(), "FR");
    expect(fr).toContain(CHECKED_TEXT.fr.adsGeneral);
    expect(fr).not.toContain("France");
  });

  it("picture and sound only when it was measured clean on this file", () => {
    const h = card("en", item({ checked: { picture: false } }));
    expect(h).toContain("Software-checked: clinical accuracy, advertising rules (Germany).");
    expect(h).not.toContain("picture and sound");
  });

  it("no line where the stored results prove nothing: unchecked, flagged-unchecked, an older video, a recording", () => {
    const unchecked = item({ status: "flagged", reasons: ["unchecked"], checked: undefined });
    expect(lineCount(card("en", unchecked))).toBe(0);
    expect(card("en", unchecked)).toContain(APP_TEXT.en.library.whatToCheck);
    expect(lineCount(panel("en", unchecked))).toBe(0);
    expect(lineCount(card("en", item({ checked: undefined })))).toBe(0);
    expect(lineCount(card("en", item({ kind: "recording", checked: undefined })))).toBe(0);
    expect(lineCount(html(<CheckedLine locale="en" />))).toBe(0);
  });

  it("a flagged video whose reviews passed says so next to what to check (the pause), without picture and sound", () => {
    const h = card("en", item({ status: "flagged", reasons: ["pause"], checked: { picture: false } }));
    expect(h).toContain(APP_TEXT.en.library.whatToCheck);
    expect(h).toContain("Software-checked: clinical accuracy, advertising rules (Germany).");
    expect(h.indexOf(APP_TEXT.en.library.whatToCheck)).toBeLessThan(h.indexOf("data-checked-line"));
  });

  it("only on a video there to decide on or post: not while it is made, re-made, failed or declined", () => {
    for (const over of [
      { status: "working" as const, videoUrl: undefined },
      { status: "failed" as const },
      { approval: "rejected" as const },
      { photos: { ...photos, status: "queued" as const } },
      { photos, change: { status: "working" as const, reason: null, at: "2026-11-23T09:00:00Z" } },
    ]) {
      expect(lineCount(card("en", item(over))), JSON.stringify(over)).toBe(0);
    }
    expect(lineCount(card("en", item({ approval: "approved" })))).toBe(1);
    expect(lineCount(card("en", item({ status: "flagged", reasons: ["wording"] })))).toBe(1);
  });

  it("the library passes the clinic's country to the cards", () => {
    const h = html(<Library locale="en" items={[item()]} canStartWeek={false} currentWeek={WEEK} country="US" />);
    expect(h).toContain("advertising rules (United States)");
  });

  it.each(LOCALES)("%s: in the review, next to the decision while deciding, and after the post step once approved", (l: Locale) => {
    const t = APP_TEXT[l].library;
    const deciding = panel(l, item());
    expect(lineCount(deciding)).toBe(1);
    // Above the decision buttons, so it is read before approving.
    expect(deciding.indexOf("data-checked-line")).toBeLessThan(deciding.indexOf(`${t.approve}</button>`));
    const approved = panel(l, item({ approval: "approved" }));
    expect(lineCount(approved)).toBe(1);
    // The share button stays first on the post sheet.
    expect(approved.indexOf(APP_TEXT[l].library.post.markPosted)).toBeLessThan(approved.indexOf("data-checked-line"));
    expect(lineCount(panel(l, item({ approval: "rejected" })))).toBe(0);
  });

  it.each(LOCALES)("%s: plain, calm words: no dashes, no exclamation marks, nothing that reads as approval, compliance or a guarantee", (l: Locale) => {
    const c = CHECKED_TEXT[l];
    const all = Object.values(c).join(" | ");
    expect(all).not.toMatch(/[—–!！]/);
    expect(all).not.toMatch(/approv|complian|guarant|certif|freigegeben|konform|garant|aprobad|conform|onaylan|uyumlu|保証|承認|適合|معتمد|مضمون|متوافق|zatwierdz|zgodn|gwarant/i);
    // The app's own word for an approved video never appears in the line.
    expect(all).not.toContain(APP_TEXT[l].library.state.approved);
    for (const k of ["line", "accuracy", "adsIn", "adsGeneral", "picture", "how", "scriptAndCaption", "playFrom", "marked"] as const) {
      expect(c[k].trim().length, `${l} ${k}`).toBeGreaterThan(1);
      if (l !== "en") expect(c[k], `${l} ${k}`).not.toBe(CHECKED_TEXT.en[k]);
    }
    expect(c.line).toContain("{parts}");
    expect(c.adsIn).toContain("{country}");
    expect(c.playFrom).toContain("{time}");
  });
});

/* ---------------------------------------------------------------- the script */

describe("'Script and caption' in the review", () => {
  const script = [
    { text: "Bleeding gums are common.", at: 0 },
    { text: "Most of the time it starts with plaque along the gum line.", at: 2.9 },
    { text: "See your dentist if it lasts.", at: 14.2 },
  ];

  it.each(LOCALES)("%s: the narration and the caption in one fold, times to play from, closed so the buttons stay in reach", (l: Locale) => {
    const c = CHECKED_TEXT[l];
    const h = panel(l, item({ script }), { onSeek: () => {} });
    expect(h).toContain(`${c.scriptAndCaption}<svg`);
    expect(h).toContain(`>${c.narration}</p>`);
    for (const s of script) expect(h).toContain(s.text);
    expect(h).toContain(APP_TEXT[l].library.captionAndHashtags);
    expect(h).toContain("Two minutes, twice a day.");
    expect(h).toContain(`aria-label="${fillChecked(c.playFrom, { time: "0:14" })}"`);
    expect(h).not.toMatch(/<details open/);
  });

  it("a time plays the video on screen from there", () => {
    const onSeek = vi.fn();
    const it1 = item({ script });
    const tree = treeOf(() => ReviewPanel({ locale: "en", item: it1, queue: [it1], index: 0, onIndex: () => {}, decide: noop, posted: false, onPosted: () => {}, onSeek }));
    const [text] = elementsOf<React.ComponentProps<typeof ScriptText>>(tree, ScriptText);
    const inner = treeOf(() => ScriptText(text.props));
    const time = elementsOf<Props & { "aria-label"?: string }>(inner, "button").find((b) => b.props["aria-label"] === "Play from 0:14")!;
    time.props.onClick!();
    expect(onSeek).toHaveBeenCalledWith(14.2);
  });

  it("without a player to seek (or without stored times) the times are plain text or absent, never dead buttons", () => {
    const h = panel("en", item({ script }));
    expect(h).toContain(">0:14</span>");
    expect(h).not.toContain('aria-label="Play from 0:14"');
    const untimed = panel("en", item({ script: script.map(({ text }) => ({ text })) }), { onSeek: () => {} });
    expect(untimed).not.toMatch(/\d:\d\d/);
    expect(untimed).toContain("See your dentist if it lasts.");
  });

  it("a video with no script keeps the plain caption fold", () => {
    const h = panel("en", item({ script: undefined }));
    expect(h).toContain(`${APP_TEXT.en.library.captionAndHashtags}<svg`);
    expect(h).not.toContain(CHECKED_TEXT.en.narration);
  });

  it.each(LOCALES)("%s: a recorded clip flagged for its wording opens on the marked sentence, named as marked by our check", (l: Locale) => {
    const c = CHECKED_TEXT[l];
    const clip = item({
      kind: "recording",
      status: "flagged",
      reasons: ["wording"],
      checked: undefined,
      script: [{ text: "Implants are painless for everyone.", marked: true }, { text: "Ask us what suits you." }],
    });
    const h = panel(l, clip);
    expect(h).toMatch(/<details open=""/);
    expect(h).toContain(`${c.wordsAndCaption}<svg`);
    expect(h).toContain(`>${c.spoken}</p>`);
    expect(h).toContain(c.marked);
    expect((h.match(/data-marked=""/g) ?? []).length).toBe(1);
    expect(h.indexOf(c.marked)).toBeLessThan(h.indexOf("Implants are painless"));
  });

  it("the times read left to right in Arabic too", () => {
    const h = panel("ar", item({ script }), { onSeek: () => {} });
    expect(h).toMatch(/<button type="button" dir="ltr"[^>]*aria-label="تشغيل من 0:14"/);
    expect(clock(65.9)).toBe("1:05");
    expect(clock(-1)).toBe("0:00");
  });
});

/* ------------------------------------------------- library decline: ask for a change instead */

describe("the library card's decline form offers 'Ask for a change instead', as the review player does", () => {
  const t = APP_TEXT.en.library;
  const rv = REVIEW_TEXT.en;
  const rq = REQUESTS_TEXT.en.change;
  const note = "The second sentence says three times a day. We say twice.";

  it("a video that can be changed: the decline form gets the offer, with the review player's words", () => {
    const it1 = item({ photos });
    const { tree } = playThrough(() => ItemCard(cardProps(it1)), [(tree) => buttonExactly(tree, t.decline)!.props.onClick!()]);
    const [form] = elementsOf<DeclineProps>(tree, DeclineForm);
    expect(form).toBeDefined();
    expect(form.props.changeInstead?.text).toEqual(REVIEW_TEXT.en);
    // While the decline form is open the change is offered inside it, not twice.
    expect(elementsOf(tree, ChangeRequest)).toHaveLength(0);
    // Rendered, 'wrong' and 'look' show it first (DeclineForm's own rule, tested in review-flow.test.tsx).
    const h = html(<DeclineForm {...form.props} initial={{ reason: "wrong", words: note }} />);
    expect(h).toContain(rv.changeInstead);
  });

  it("no offer where a change cannot be made: no photos (an older video, a recording)", () => {
    const it1 = item({ photos: undefined });
    const { tree } = playThrough(() => ItemCard(cardProps(it1)), [(tree) => buttonExactly(tree, t.decline)!.props.onClick!()]);
    expect(elementsOf<DeclineProps>(tree, DeclineForm)[0].props.changeInstead).toBeUndefined();
  });

  it("choosing it carries the reason's words into the change form, opened once", () => {
    const it1 = item({ photos });
    const { tree, html: h } = playThrough(() => ItemCard(cardProps(it1)), [
      (tree) => buttonExactly(tree, t.decline)!.props.onClick!(),
      (tree) => elementsOf<DeclineProps>(tree, DeclineForm)[0].props.changeInstead!.onChoose("wrong", note),
    ]);
    expect(elementsOf(tree, DeclineForm)).toHaveLength(0);
    const forms = elementsOf<ChangeProps>(tree, ChangeRequest);
    expect(forms).toHaveLength(1);
    expect(forms[0].props.startOpen).toBe(true);
    expect(forms[0].props.initialNote).toBe(note);
    expect(h).toContain(`>${note}</textarea>`);
    expect(h).toContain(rq.title);
  });

  it("cancelled, it opens nothing by itself later; Decline opens again with the reason and the words", () => {
    const it1 = item({ photos });
    const { tree } = playThrough(() => ItemCard(cardProps(it1)), [
      (tree) => buttonExactly(tree, t.decline)!.props.onClick!(),
      (tree) => elementsOf<DeclineProps>(tree, DeclineForm)[0].props.changeInstead!.onChoose("look", note),
      (tree) => {
        const [form] = elementsOf<ChangeProps>(tree, ChangeRequest);
        form.props.onOpenChange!(true);
        form.props.onOpenChange!(false);
      },
      (tree) => expect(elementsOf<ChangeProps>(tree, ChangeRequest)[0].props.startOpen).toBe(false),
      (tree) => buttonExactly(tree, t.decline)!.props.onClick!(),
    ]);
    const [again] = elementsOf<DeclineProps>(tree, DeclineForm);
    expect(again.props.initial).toEqual({ reason: "look", words: note });
  });

  it.each(["limit", "no_plan"])("refused for the week (%s): the error is said, no change is offered again, and the decline form comes back with the words as edited", (code) => {
    const it1 = item({ photos });
    const edited = `${note} Please.`;
    const { tree, html: h } = playThrough(() => ItemCard(cardProps(it1)), [
      (tree) => buttonExactly(tree, t.decline)!.props.onClick!(),
      (tree) => elementsOf<DeclineProps>(tree, DeclineForm)[0].props.changeInstead!.onChoose("wrong", note),
      (tree) => elementsOf<ChangeProps>(tree, ChangeRequest)[0].props.onFailed!({ code, message: rq.errors.limit, note: edited }),
    ]);
    const [form] = elementsOf<DeclineProps>(tree, DeclineForm);
    expect(form.props.initial).toEqual({ reason: "wrong", words: edited });
    expect(form.props.changeInstead).toBeUndefined();
    expect(elementsOf(tree, ChangeRequest)).toHaveLength(0);
    expect(h).toContain(`role="alert"`);
    expect(h).toContain(rq.errors.limit);
  });

  it("other failures (busy, offline) leave the change form where it is, to try again", () => {
    const it1 = item({ photos });
    const { tree } = playThrough(() => ItemCard(cardProps(it1)), [
      (tree) => buttonExactly(tree, t.decline)!.props.onClick!(),
      (tree) => elementsOf<DeclineProps>(tree, DeclineForm)[0].props.changeInstead!.onChoose("wrong", note),
      (tree) => elementsOf<ChangeProps>(tree, ChangeRequest)[0].props.onFailed!({ code: "busy", message: rq.errors.busy, note }),
      (tree) => elementsOf<ChangeProps>(tree, ChangeRequest)[0].props.onFailed!({ message: rq.errors.unavailable, note }),
    ]);
    expect(elementsOf(tree, DeclineForm)).toHaveLength(0);
    expect(elementsOf(tree, ChangeRequest)).toHaveLength(1);
  });

  it("an accepted change ends the hand-over and refreshes the library", () => {
    const onChanged = vi.fn();
    const it1 = item({ photos });
    const { tree } = playThrough(() => ItemCard(cardProps(it1, { onChanged })), [
      (tree) => buttonExactly(tree, t.decline)!.props.onClick!(),
      (tree) => elementsOf<DeclineProps>(tree, DeclineForm)[0].props.changeInstead!.onChoose("wrong", note),
      (tree) => elementsOf<ChangeProps>(tree, ChangeRequest)[0].props.onQueued("Change requested. Changes left this week: 2 of 3", 2),
    ]);
    expect(onChanged).toHaveBeenCalledTimes(1);
    const [form] = elementsOf<ChangeProps>(tree, ChangeRequest);
    expect(form.props.startOpen).toBe(false);
    expect(form.props.initialNote).toBeUndefined();
  });

  it("a saved decline ends it too, and sends the note the way the decline form writes it", async () => {
    const decide = vi.fn(async () => true);
    const it1 = item({ photos });
    let submit: ((note: string | undefined) => void) | undefined;
    playThrough(() => ItemCard(cardProps(it1, { decide })), [
      (tree) => buttonExactly(tree, t.decline)!.props.onClick!(),
      (tree) => {
        submit = elementsOf<DeclineProps>(tree, DeclineForm)[0].props.onSubmit;
      },
    ]);
    submit!("[wrong] three times a day");
    await Promise.resolve();
    expect(decide).toHaveBeenCalledWith(it1.id, "rejected", "[wrong] three times a day");
  });
});
