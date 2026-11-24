import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type * as ReactNS from "react";

/**
 * Where a failure costs the most (creating the account, opening checkout, the billing portal),
 * the error never ends in "Please try again" alone: a line with a person to write to follows it
 * (help-line.tsx). The repo has no DOM test library, so, as in start-form-flow.test.tsx, React's
 * hooks are swapped for a tiny stand-in and each component is called as a function; the element
 * tree it returns is what React would draw.
 */

const h = vi.hoisted(() => ({ cells: [] as unknown[], i: 0, dirty: false, layout: [] as (() => void)[], passive: [] as (() => void)[], ids: 0 }));

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
      if (!(i in h.cells)) h.cells[i] = typeof init === "function" ? (init as () => unknown)() : init;
      const set = (v: unknown) => {
        const next = typeof v === "function" ? (v as (p: unknown) => unknown)(h.cells[i]) : v;
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
    useId: () => {
      const i = h.i++;
      if (!(i in h.cells)) h.cells[i] = `id-${++h.ids}`;
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
vi.mock("@/lib/dentvid/ad-click", () => ({ readAdClick: () => null }));
// Signing in runs in the browser through Supabase: here every password is wrong.
vi.mock("@/lib/dentvid/supabase", () => ({ dvBrowser: () => ({ auth: { signInWithPassword: async () => ({ error: { message: "Invalid login credentials" } }), signOut: async () => ({}) } }), BUCKET: "dentvid" }));

import * as React from "react";
import { appText } from "@/content/dentvideo-app";
import { authText } from "@/content/dentvideo-auth";
import { accountText } from "@/content/dentvideo-account";
import { DV_SELF_SERVE_TIERS } from "@/lib/dentvid/billing";
(globalThis as { React?: typeof React }).React = React;

type El = React.ReactElement<Record<string, unknown> & { children?: React.ReactNode }>;

function render<P>(C: (p: P) => React.ReactNode, props: P): React.ReactNode {
  let tree: React.ReactNode;
  let n = 0;
  do {
    h.dirty = false;
    h.i = 0;
    tree = C(props);
    for (const fn of h.layout.splice(0)) fn();
    if (++n > 20) throw new Error("render loop");
  } while (h.dirty);
  return tree;
}

/** Every element, with plain function components (no hooks of their own) drawn out, as React would. */
function all(node: React.ReactNode, out: El[] = []): El[] {
  if (Array.isArray(node)) node.forEach((c) => all(c, out));
  else if (React.isValidElement(node)) {
    const el = node as El;
    out.push(el);
    if (typeof el.type === "function" && ["ErrorLine", "HelpLine"].includes((el.type as { name?: string }).name ?? "")) all((el.type as (p: unknown) => React.ReactNode)(el.props), out);
    all(el.props.children, out);
  }
  return out;
}
const find = (tree: React.ReactNode, pred: (el: El) => boolean) => all(tree).find(pred) ?? null;
const helpLine = (tree: React.ReactNode) => find(tree, (e) => typeof e.props["data-help-line"] === "string");
/** next/dynamic's wrapper around the lazily loaded line (the sign-up form): it carries the props. */
const lazyLine = (tree: React.ReactNode) => find(tree, (e) => typeof e.type !== "string" && typeof e.props.code === "string" && "message" in e.props);
const alertText = (tree: React.ReactNode) => {
  const el = find(tree, (e) => e.props.role === "alert");
  return el ? String(el.props.children) : null;
};

beforeEach(() => {
  h.cells = [];
  h.layout = [];
  h.passive = [];
  vi.stubGlobal("window", { location: { search: "", host: "localhost", protocol: "http:", href: "" }, addEventListener: () => {}, removeEventListener: () => {}, sessionStorage: { getItem: () => null } });
  vi.stubGlobal("document", new EventTarget());
  vi.stubGlobal("sessionStorage", { getItem: () => null });
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

/* ------------------------------------------------------------------ sign-up */

describe("sign-up: the account step", () => {
  type Props = { locale: "en" | "de" | "tr"; remember: boolean; initialMode?: "signup" | "signin" | "forgot" };
  async function send(props: Props, answer: () => Promise<unknown>) {
    const { StartForm } = (await import("./start-form")) as unknown as { StartForm: (p: Props) => React.ReactNode };
    vi.stubGlobal("fetch", vi.fn(answer));
    let tree = render(StartForm, props);
    // Past the bot brake's 2.7 s since the form opened.
    vi.spyOn(Date, "now").mockReturnValue(Date.now() + 10_000);
    const input = (field: string) => find(tree, (e) => e.type === "input" && e.props["data-field"] === field)!;
    (input("email").props.onChange as (e: unknown) => void)({ target: { value: "dr.smith@clinic.example" } });
    tree = render(StartForm, props);
    (input("password").props.onChange as (e: unknown) => void)({ target: { value: "a-long-password" } });
    tree = render(StartForm, props);
    const form = find(tree, (e) => typeof e.type === "function" && (e.type as { name?: string }).name === "ValidatingForm")!;
    await (form.props.onSubmit as (e: unknown) => Promise<void>)({ preventDefault: () => {} });
    return render(StartForm, props);
  }

  it("a refused sign-up shows the error, then a line with a person to write to and a reference", async () => {
    const tree = await send({ locale: "de", remember: false }, async () => ({ ok: false, status: 500, json: async () => ({}) }));
    expect(alertText(tree)).toBe(appText("de").errors.createFailed);
    const line = lazyLine(tree);
    expect(line?.props).toMatchObject({ locale: "de", code: "signup-500", message: appText("de").errors.createFailed });
  });

  it("a connection that drops gets the line too", async () => {
    const tree = await send({ locale: "en", remember: false }, async () => {
      throw new TypeError("Failed to fetch");
    });
    expect(alertText(tree)).toBe("Failed to fetch");
    expect(lazyLine(tree)?.props).toMatchObject({ code: "signup-network" });
  });

  it("a slip the person fixes (a wrong password, an address that already has an account) gets no line", async () => {
    const wrong = await send({ locale: "en", remember: false, initialMode: "signin" }, async () => ({ ok: true, status: 200, json: async () => ({}) }));
    expect(alertText(wrong)).toBe(appText("en").start.wrongPassword);
    expect(lazyLine(wrong)).toBeNull();
    h.cells = [];
    const exists = await send({ locale: "en", remember: false }, async () => ({ ok: true, status: 200, json: async () => ({ existing: true }) }));
    expect(alertText(exists)).toBe(authText("en").accountExists);
    expect(lazyLine(exists)).toBeNull();
  });

  it("the line's module is not part of the sign-up page: it is loaded only once an error shows", async () => {
    const fs = await import("node:fs");
    const src = fs.readFileSync(new URL("./start-form.tsx", import.meta.url), "utf8");
    expect(src).not.toMatch(/^import .*["']\.\/help-line["']/m);
    expect(src).not.toMatch(/^import .*dentvideo-help-line/m);
    expect(src).toMatch(/dynamic\(\(\) => import\("\.\/help-line"\)/);
  });
});

/* ------------------------------------------------------------------ checkout */

describe("checkout: the plan cards", () => {
  const options = DV_SELF_SERVE_TIERS.map((tier) => ({ tier, interval: "month" as const, prices: { USD: 49, EUR: 49, TRY: 1490 } }));
  async function choose(answer: () => Promise<unknown>, locale: "en" | "ar" = "en") {
    const { PlanPanel } = await import("./plan-panel");
    vi.stubGlobal("fetch", vi.fn(answer));
    const props = { locale, state: "trial" as const, options: options as never, country: "US" };
    let tree = render(PlanPanel, props);
    expect(helpLine(tree)).toBeNull();
    const button = find(tree, (e) => e.type === "button" && typeof e.props.onClick === "function")!;
    await (button.props.onClick as () => Promise<void>)();
    tree = render(PlanPanel, props);
    return tree;
  }

  it("a checkout that would not open: the error, then the line with the address, the help center and a reference", async () => {
    const tree = await choose(async () => ({ ok: false, status: 502, json: async () => ({ error: appText("en").errors.checkoutFailed }) }));
    expect(alertText(tree)).toBe(appText("en").errors.checkoutFailed);
    const line = helpLine(tree)!;
    expect(line.props["data-help-line"]).toBe("checkout-502");
    const links = all(line).filter((e) => e.type === "a");
    expect(links).toHaveLength(2);
    expect(String(links[0].props.href)).toMatch(/^mailto:hello@dentvideo\.com\?subject=DentVideo%20help%20%C2%B7%20checkout-502&body=/);
    expect(decodeURIComponent(String(links[0].props.href))).toContain(appText("en").errors.checkoutFailed);
    expect(links[1].props.href).toMatch(/\/help$/);
  });

  it("no answer at all (offline): the same line, in the clinic's language", async () => {
    const tree = await choose(async () => {
      throw new TypeError("Failed to fetch");
    }, "ar");
    expect(alertText(tree)).toBe(appText("ar").errors.checkoutFailed);
    expect(helpLine(tree)?.props["data-help-line"]).toBe("checkout-network");
  });
});

/* ------------------------------------------------------------------ billing */

describe("settings: the billing portal", () => {
  it("a portal that would not open: the error and the line under it", async () => {
    const { AccountPanel } = await import("./account-panel");
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 502, json: async () => ({ error: accountText("tr").errors.billingFailed }) })));
    const props = {
      part: "billing" as const,
      locale: "tr" as const,
      selfServe: true,
      plan: { plan: "active" as const, tier: "starter" as const, renewsAt: null, canMake: true },
      plans: [],
      clinicName: "Örnek Diş",
    };
    let tree = render(AccountPanel, props);
    expect(helpLine(tree)).toBeNull();
    const button = find(tree, (e) => e.type === "button" && typeof e.props.onClick === "function" && e.props.disabled === false)!;
    await (button.props.onClick as () => Promise<void>)();
    tree = render(AccountPanel, props);
    expect(alertText(tree)).toBe(accountText("tr").errors.billingFailed);
    const line = helpLine(tree)!;
    expect(line.props["data-help-line"]).toBe("billing-portal");
    expect(all(line).some((e) => e.type === "a" && String(e.props.href).startsWith("mailto:hello@dentvideo.com?subject=DentVideo%20yard%C4%B1m"))).toBe(true);
  });
});
