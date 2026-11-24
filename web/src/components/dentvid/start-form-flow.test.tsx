import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type * as ReactNS from "react";

/**
 * The sign-up form's behaviour over time: what the visitor sees before the
 * extras chunk arrives and after, how the typo hint follows the email field,
 * and that the ad click still rides on the sign-up now that its rules load
 * later. The repo has no DOM test library, so React's hooks are swapped for a
 * tiny stand-in (state cells, layout effects before "paint", effects after,
 * deps compared as React does) and StartForm is called as a function; the
 * element tree it returns is what React would draw.
 */

type Cell = unknown;
const h = vi.hoisted(() => ({
  cells: [] as unknown[],
  i: 0,
  dirty: false,
  layout: [] as (() => void)[],
  passive: [] as (() => void)[],
  extrasLoads: 0,
  extrasFail: false,
  adLoads: 0,
  adFail: false,
}));

vi.mock("react", async (importOriginal) => {
  const real = await importOriginal<typeof ReactNS>();
  const changed = (a: unknown[] | undefined, b: unknown[] | undefined) => !a || !b || a.length !== b.length || a.some((v, k) => !Object.is(v, b[k]));
  const effect = (queue: "layout" | "passive") => (fn: () => void, deps?: unknown[]) => {
    const i = h.i++;
    const prev = h.cells[i] as { deps?: unknown[] } | undefined;
    if (!prev || changed(prev.deps, deps)) {
      h.cells[i] = { deps };
      h[queue].push(fn);
    }
  };
  return {
    ...real,
    default: real,
    useState: (init: unknown) => {
      const i = h.i++;
      if (!(i in h.cells)) h.cells[i] = typeof init === "function" ? (init as () => Cell)() : init;
      const set = (v: unknown) => {
        const next = typeof v === "function" ? (v as (p: Cell) => Cell)(h.cells[i]) : v;
        if (!Object.is(next, h.cells[i])) {
          h.cells[i] = next;
          h.dirty = true;
        }
      };
      return [h.cells[i], set];
    },
    useRef: (init: unknown) => {
      const i = h.i++;
      if (!(i in h.cells)) h.cells[i] = { current: init };
      return h.cells[i];
    },
    useLayoutEffect: effect("layout"),
    useEffect: effect("passive"),
  };
});

vi.mock("next/navigation", () => ({
  usePathname: () => "/dentvideo/start",
  useRouter: () => ({ push: () => {}, replace: () => {}, refresh: () => {}, prefetch: () => {} }),
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("./chrome", () => ({ announceLocale: () => {} }));
vi.mock("@/lib/dentvid/attribution", () => ({ captureFromLocation: () => {}, readAttribution: () => null }));
vi.mock("@/lib/dentvid/events-client", () => ({ trackDv: () => {} }));
vi.mock("@/lib/dentvid/internal-flag", () => ({ isInternalBrowser: () => false }));

import * as React from "react";
import { appText } from "@/content/dentvideo-app";
import { authText } from "@/content/dentvideo-auth";
import { SIGNUP_SAVED } from "@/content/dentvideo-signup-saved";
import { TEASER_KEY } from "@/lib/dentvid/onboarding";

(globalThis as { React?: typeof React }).React = React;

type Props = { locale: "en" | "de" | "tr"; remember: boolean; initialMode?: "signup" | "signin" | "forgot" };
type El = React.ReactElement<Record<string, unknown> & { children?: React.ReactNode }>;
let StartForm: (p: Props) => React.ReactNode;

/** Draw: render, run layout effects, and render again while they changed state (what reaches the screen). */
function paint(props: Props): React.ReactNode {
  let tree: React.ReactNode;
  let n = 0;
  do {
    h.dirty = false;
    h.i = 0;
    tree = StartForm(props);
    for (const fn of h.layout.splice(0)) fn();
    if (++n > 20) throw new Error("render loop");
  } while (h.dirty);
  return tree;
}

const flush = async () => {
  await vi.dynamicImportSettled();
  for (let k = 0; k < 10; k++) await Promise.resolve();
};

/** Run effects and let the chunks they load arrive, then draw again until nothing changes. */
async function settle(props: Props): Promise<React.ReactNode> {
  let tree = paint(props);
  for (let n = 0; n < 20; n++) {
    const fx = h.passive.splice(0);
    for (const fn of fx) fn();
    await flush();
    if (!fx.length && !h.dirty) return tree;
    tree = paint(props);
  }
  throw new Error("never settled");
}

function all(node: React.ReactNode, out: El[] = []): El[] {
  if (Array.isArray(node)) node.forEach((c) => all(c, out));
  else if (React.isValidElement(node)) {
    out.push(node as El);
    all((node as El).props.children, out);
  }
  return out;
}
const find = (tree: React.ReactNode, pred: (el: El) => boolean) => all(tree).find(pred) ?? null;
const named = (name: string) => (el: El) => typeof el.type === "function" && (el.type as { name?: string }).name === name;
const text = (tree: React.ReactNode, tag: string) => {
  const el = find(tree, (e) => e.type === tag);
  return el ? String(el.props.children) : null;
};
const emailInput = (tree: React.ReactNode) => find(tree, (e) => e.type === "input" && e.props["data-field"] === "email")!;
const hintFor = (tree: React.ReactNode) => find(tree, named("EmailHint"));
const recapBox = (tree: React.ReactNode) => find(tree, (e) => e.props["data-recap-box"] === true);

let stored: string | null;
/** The page's address; window.sessionStorage is the same storage as the global, as in a browser. */
const at = (search: string) =>
  vi.stubGlobal("window", {
    location: { search, host: "localhost", protocol: "http:" },
    get sessionStorage() {
      return globalThis.sessionStorage;
    },
  });
beforeEach(async () => {
  h.cells = [];
  h.layout = [];
  h.passive = [];
  h.extrasLoads = 0;
  h.extrasFail = false;
  h.adLoads = 0;
  h.adFail = false;
  stored = null;
  at("");
  vi.stubGlobal("sessionStorage", { getItem: (k: string) => (k === TEASER_KEY ? stored : null) });
  vi.resetModules();
  // The two chunks start-form loads after mount: counted, and made to fail on demand (fresh each test).
  vi.doMock("./signup-extras", async (importOriginal) => {
    h.extrasLoads++;
    if (h.extrasFail) throw new Error("chunk gone after a deploy");
    return importOriginal();
  });
  vi.doMock("@/lib/dentvid/ad-click", () => {
    h.adLoads++;
    if (h.adFail) throw new Error("chunk gone after a deploy");
    return { readAdClick: () => ({ type: "gclid", id: "TEST123", at: 1, consent: "not_required" }) };
  });
  ({ StartForm } = (await import("./start-form")) as unknown as { StartForm: typeof StartForm });
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const en = appText("en").start;

describe("after the landing's teaser: nothing moves when the recap arrives", () => {
  it("the first paint already has the 'save your preview' words and the recap's place; the chunk fills it in", async () => {
    stored = JSON.stringify({ brandColor: "#1f4e79", name: "Riverside Family Dental" });
    const props: Props = { locale: "en", remember: false };
    const first = paint(props);
    expect(text(first, "h1")).toBe(SIGNUP_SAVED.en.titleSaved);
    expect(text(first, "p")).toBe(SIGNUP_SAVED.en.leadSaved);
    const box = recapBox(first);
    expect(box, "the recap's place is kept before the chunk").not.toBeNull();
    expect(find(box!.props.children, named("TeaserRecap"))).toBeNull();

    const done = await settle(props);
    expect(h.extrasLoads).toBe(1);
    expect(text(done, "h1")).toBe(SIGNUP_SAVED.en.titleSaved);
    const filled = recapBox(done)!;
    const recap = find(filled.props.children, named("TeaserRecap"));
    expect(recap?.props.seed).toEqual({ name: "Riverside Family Dental", brandColor: "#1f4e79", logo: null });
    // The box and the card share one min-height, so the form stays where it was drawn.
    const minH = String(filled.props.className).match(/min-h-\[[^\]]+\]/)?.[0];
    expect(minH).toBeTruthy();
    const card = all((recap!.type as (p: unknown) => React.ReactNode)(recap!.props)).find((e) => e.props["data-teaser-recap"]);
    expect(String(card?.props.className)).toContain(minH!);
  });

  it("no teaser in this tab: the plain sign-up from the first paint on, and no place kept", async () => {
    const props: Props = { locale: "en", remember: false };
    for (const tree of [paint(props), await settle(props)]) {
      expect(text(tree, "h1")).toBe(en.titleSignup);
      expect(recapBox(tree)).toBeNull();
    }
    // Only the colour every visit starts with: not a preview either.
    stored = JSON.stringify({ brandColor: "#0f5c5c" });
    h.cells = [];
    expect(text(paint(props), "h1")).toBe(en.titleSignup);
  });

  it("a stored value the full check refuses: back to the plain sign-up once the chunk has looked", async () => {
    stored = JSON.stringify({ name: { first: "Smile" }, brandColor: "#0f5c5c" });
    const props: Props = { locale: "en", remember: false };
    const done = await settle(props);
    expect(text(done, "h1")).toBe(en.titleSignup);
    expect(recapBox(done)).toBeNull();
    // The typo hint still works.
    expect(hintFor(done)).not.toBeNull();
  });

  it("the chunk never arrives: the plain sign-up, no empty box, no hint, and the form still works", async () => {
    stored = JSON.stringify({ name: "Riverside Family Dental", brandColor: "#0f5c5c" });
    h.extrasFail = true;
    const props: Props = { locale: "en", remember: false };
    expect(text(paint(props), "h1")).toBe(SIGNUP_SAVED.en.titleSaved);
    const done = await settle(props);
    expect(text(done, "h1")).toBe(en.titleSignup);
    expect(recapBox(done)).toBeNull();
    expect(hintFor(done)).toBeNull();
    expect(emailInput(done)).toBeTruthy();
  });

  it("garbage or blocked storage: the plain sign-up, nothing thrown", async () => {
    const props: Props = { locale: "en", remember: false };
    stored = "\u0000not json";
    expect(text(await settle(props), "h1")).toBe(en.titleSignup);
    h.cells = [];
    vi.stubGlobal("sessionStorage", {
      getItem: () => {
        throw new DOMException("The operation is insecure.", "SecurityError");
      },
    });
    expect(text(await settle(props), "h1")).toBe(en.titleSignup);
  });

  it("in the page's language", () => {
    stored = JSON.stringify({ name: "Zahnarztpraxis Weber", brandColor: "#0f5c5c" });
    expect(text(paint({ locale: "de", remember: false }), "h1")).toBe(SIGNUP_SAVED.de.titleSaved);
  });
});

describe("sign-in and forgot-password", () => {
  it.each(["signin", "forgot"] as const)("%s: never loads the sign-up extras, and keeps its own title even with a teaser", async (mode) => {
    stored = JSON.stringify({ name: "Riverside Family Dental", brandColor: "#0f5c5c" });
    at(`?mode=${mode}`);
    const done = await settle({ locale: "en", remember: false, initialMode: mode });
    expect(h.extrasLoads).toBe(0);
    expect(text(done, "h1")).toBe(mode === "signin" ? en.titleSignin : authText("en").forgotTitle);
    expect(recapBox(done)).toBeNull();
    expect(hintFor(done)).toBeNull();
  });

  it("switching to sign-up loads them then", async () => {
    at("?mode=signin");
    const props: Props = { locale: "en", remember: false, initialMode: "signin" };
    let tree: React.ReactNode = await settle(props);
    expect(h.extrasLoads).toBe(0);
    const toggle = all(tree).filter((e) => e.type === "button" && e.props.children === en.toSignup)[0];
    (toggle.props.onClick as () => void)();
    tree = await settle(props);
    expect(h.extrasLoads).toBe(1);
    expect(hintFor(tree)).not.toBeNull();
  });
});

describe("the typo hint follows the address as it was left, never one being typed", () => {
  const props: Props = { locale: "en", remember: false };
  const type = (tree: React.ReactNode, value: string) => (emailInput(tree).props.onChange as (e: unknown) => void)({ target: { value } });
  const leave = (tree: React.ReactNode, value: string) => (emailInput(tree).props.onBlur as (e: unknown) => void)({ target: { value } });

  it("nothing while typing, the left address on blur, cleared by the next keystroke until the field is left again", async () => {
    let tree: React.ReactNode = await settle(props);
    type(tree, "dr.smith@gmial.com");
    tree = paint(props);
    expect(hintFor(tree)?.props.email, "still in the field").toBe("");

    leave(tree, "dr.smith@gmial.com");
    tree = paint(props);
    expect(hintFor(tree)?.props.email).toBe("dr.smith@gmial.com");

    // Back in the field, on the way to another address: no suggestion for a half-typed one.
    for (const partial of ["dr.smith@gmx.n", "dr.smith@yahoo.co", "dr.smith@yahoo.co.u"]) {
      type(tree, partial);
      tree = paint(props);
      expect(hintFor(tree)?.props.email, partial).toBe("");
    }
    type(tree, "dr.smith@yahoo.co.uk");
    leave(paint(props), "dr.smith@yahoo.co.uk");
    tree = paint(props);
    expect(hintFor(tree)?.props.email).toBe("dr.smith@yahoo.co.uk");
    expect(emailInput(tree).props.value).toBe("dr.smith@yahoo.co.uk");
  });

  it("the hint's fix puts the address in the field and the hint goes away", async () => {
    let tree: React.ReactNode = await settle(props);
    type(tree, "dr.smith@gmial.com");
    leave(paint(props), "dr.smith@gmial.com");
    tree = paint(props);
    (hintFor(tree)!.props.onFix as (a: string) => void)("dr.smith@gmail.com");
    tree = paint(props);
    expect(emailInput(tree).props.value).toBe("dr.smith@gmail.com");
    expect(hintFor(tree)?.props.email).toBe("");
  });
});

describe("the ad click on sign-up, now loaded after the page", () => {
  const props: Props = { locale: "en", remember: false };

  async function signUp(): Promise<Record<string, unknown>> {
    const fetchMock = vi.fn(async () => ({ ok: true, json: async () => ({ signedIn: true }) }));
    vi.stubGlobal("fetch", fetchMock);
    let tree: React.ReactNode = await settle(props);
    (emailInput(tree).props.onChange as (e: unknown) => void)({ target: { value: "dr.smith@gmail.com" } });
    tree = paint(props);
    const pw = find(tree, (e) => e.type === "input" && e.props["data-field"] === "password")!;
    (pw.props.onChange as (e: unknown) => void)({ target: { value: "a-long-password" } });
    tree = paint(props);
    // Past the bot brake's 2.7 s.
    const now = Date.now();
    vi.spyOn(Date, "now").mockReturnValue(now + 10_000);
    const form = find(tree, named("ValidatingForm"))!;
    await (form.props.onSubmit as (e: unknown) => Promise<void>)({ preventDefault: () => {} });
    const call = fetchMock.mock.calls.find((c) => String((c as unknown[])[0]) === "/api/dentvideo/signup") as unknown[] | undefined;
    expect(call, "the sign-up was sent").toBeTruthy();
    return JSON.parse(String((call![1] as { body: string }).body));
  }

  it("is read when the form is sent and goes with the sign-up, as before", async () => {
    const body = await signUp();
    expect(h.adLoads).toBe(1);
    expect(body.adClick).toEqual({ type: "gclid", id: "TEST123", at: 1, consent: "not_required" });
    expect(body.email).toBe("dr.smith@gmail.com");
  });

  it("its chunk failing never stops the sign-up: it is sent without the click", async () => {
    h.adFail = true;
    const body = await signUp();
    expect(body).not.toHaveProperty("adClick");
    expect(body.email).toBe("dr.smith@gmail.com");
  });
});
