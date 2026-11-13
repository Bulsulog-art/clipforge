import { describe, expect, it } from "vitest";
import { filterClinics, filterVideos, isProblemVideo, lastActivity, parseClinicFilter, parseRange, parseVideoFilter, qs, type ClinicRowView, type VideoRow } from "./admin-filters";
import { billingIssues, foundingFromLedger, openProblems, periodStats, type SubRow } from "./admin-ops";
import { checkViews, findingsList, scriptText } from "./admin-video";
import { emailLogFromKey } from "./email";
import { emailRows } from "@/components/dentvid/admin-screens";
import type { AdminEvent } from "./admin-metrics";

const NOW = new Date("2026-11-11T10:00:00Z");
const ago = (days: number) => new Date(NOW.getTime() - days * 86_400_000).toISOString();
const A = "0b8a3c6e-1d2f-4a5b-9c8d-7e6f5a4b3c2d";
const B = "1c9b4d7f-2e3a-4b6c-8d9e-0f1a2b3c4d5e";

describe("date range", () => {
  it("presets 1/7/30/90 days, default 30, junk ignored", () => {
    expect(parseRange({}, NOW)).toMatchObject({ days: 30, key: "30d" });
    expect(parseRange({ days: "90" }, NOW)).toMatchObject({ days: 90, label: "last 90 days" });
    expect(parseRange({ days: "1" }, NOW).label).toBe("last 24 hours");
    expect(parseRange({ days: "45" }, NOW).days).toBe(30);
  });

  it("custom from/to: inclusive UTC days, never past now, at most a year", () => {
    const r = parseRange({ from: "2026-11-01", to: "2026-11-07" }, NOW);
    expect(r.from.toISOString()).toBe("2026-11-01T00:00:00.000Z");
    expect(r.to.toISOString()).toBe("2026-11-07T23:59:59.999Z");
    expect(r.days).toBe(7);
    expect(r.key).toBe("2026-11-01..2026-11-07");
    expect(parseRange({ from: "2026-11-05", to: "2027-01-01" }, NOW).to.getTime()).toBe(NOW.getTime());
    expect(parseRange({ from: "2026-11-10", to: "2026-11-01" }, NOW).key).toBe("30d");
    expect(parseRange({ from: "2020-01-01" }, NOW).key).toBe("30d");
    expect(parseRange({ from: "2026-13-45" }, NOW).key).toBe("30d");
  });
});

const clinic = (o: Partial<ClinicRowView> & { id: string }): ClinicRowView => ({
  created_at: ago(10),
  plan: "trial",
  lastActivity: null,
  source: null,
  profile: { name: "X", country: "DE", language: "de" },
  ...o,
});

describe("clinic filters", () => {
  const rows = [
    clinic({ id: A, plan: "active", plan_tier: "practice", profile: { name: "Zahnzentrum Mitte", country: "DE", language: "de" }, created_at: ago(3), lastActivity: ago(0.1), source: "instagram / dm / de-launch" }),
    clinic({ id: B, plan: "trial", profile: { name: "Harbour Smiles", country: "GB", language: "en" }, created_at: ago(60), lastActivity: ago(1) }),
    clinic({ id: "c", plan: "active", admin_paused_at: ago(1), profile: { name: "Dentpark", country: "TR", language: "tr" }, created_at: ago(20), source: "google / — / —" }),
  ];
  const ids = (sp: Record<string, string>) => filterClinics(rows, parseClinicFilter(sp), NOW).map((r) => r.id);

  it("parses only known values", () => {
    expect(parseClinicFilter({ plan: "hacker", language: "DE", country: "de", created: "7", sort: "x" })).toEqual({ q: "", plan: null, language: "de", country: "DE", createdDays: 7, source: null, sort: "created" });
  });

  it("filters by search, plan, language, country, created and source", () => {
    expect(ids({ q: "harbour" })).toEqual([B]);
    expect(ids({ q: A.slice(0, 8) })).toEqual([A]);
    expect(ids({ plan: "active" })).toEqual([A, "c"]);
    expect(ids({ plan: "admin_paused" })).toEqual(["c"]);
    expect(ids({ language: "en" })).toEqual([B]);
    expect(ids({ country: "TR" })).toEqual(["c"]);
    expect(ids({ created: "7" })).toEqual([A]);
    expect(ids({ source: "instagram" })).toEqual([A]);
    expect(ids({ source: "(direct" })).toEqual([B]);
    expect(ids({ plan: "active", country: "DE" })).toEqual([A]);
  });

  it("sorts by creation (default), last activity or name", () => {
    expect(ids({})).toEqual([A, "c", B]);
    expect(ids({ sort: "activity" })).toEqual([A, B, "c"]);
    expect(ids({ sort: "name" })).toEqual(["c", B, A]);
  });

  it("last activity is the newest of creation, events and video updates", () => {
    const m = lastActivity([{ id: A, created_at: ago(9) }, { id: B, created_at: ago(5) }], [{ clinic_id: A, created_at: ago(2) }, { clinic_id: null, created_at: ago(0) }], [{ clinic_id: A, updated_at: ago(1) }]);
    expect(m.get(A)).toBe(ago(1));
    expect(m.get(B)).toBe(ago(5));
  });
});

const item = (o: Partial<VideoRow> & { id: string }): VideoRow => ({ clinic_id: A, kind: "generated", week_of: "2026-11-09", status: "ready", approval: "pending", updated_at: ago(1), video_path: "x", ...o });

describe("video filters", () => {
  const items = [
    item({ id: "ready" }),
    item({ id: "flagged", status: "flagged", findings: ["quality: quiet narration"], updated_at: ago(0.5) }),
    item({ id: "nofile", status: "flagged", findings: ["the video file is missing"], video_path: null }),
    item({ id: "failed", status: "failed", updated_at: ago(3), clinic_id: B }),
    item({ id: "rejected-tech", status: "rejected", error: "render timeout", video_path: null }),
    item({ id: "rejected-review", status: "rejected", video_path: null }),
    item({ id: "old", week_of: "2026-11-02", kind: "recording" }),
  ];
  const profiles: Record<string, { profile: { country: string; language: string } }> = { [A]: { profile: { country: "DE", language: "de" } }, [B]: { profile: { country: "GB", language: "en" } } };
  const ids = (sp: Record<string, string>) => filterVideos(items, parseVideoFilter(sp), (id) => profiles[id]).map((i) => i.id);

  it("a problem is a failure or a missing file — not a dentist's review flag", () => {
    expect(items.filter(isProblemVideo).map((i) => i.id)).toEqual(["nofile", "failed", "rejected-tech"]);
  });

  it("problems first, then flagged, then the rest; filters by status, week, kind, language and country", () => {
    expect(ids({}).slice(0, 4)).toEqual(["nofile", "rejected-tech", "failed", "flagged"]);
    expect(ids({ status: "problem" })).toEqual(["nofile", "rejected-tech", "failed"]);
    expect(ids({ status: "flagged" })).toEqual(["nofile", "flagged"]);
    expect(ids({ week: "2026-11-02" })).toEqual(["old"]);
    expect(ids({ kind: "recording" })).toEqual(["old"]);
    expect(ids({ language: "en" })).toEqual(["failed"]);
    expect(ids({ country: "GB" })).toEqual(["failed"]);
    expect(ids({ clinic: B })).toEqual(["failed"]);
    expect(parseVideoFilter({ status: "drop", week: "2026-02-31x", kind: "x" })).toEqual({ status: null, language: null, country: null, week: null, kind: null, clinicId: null });
  });

  it("qs drops empty values", () => {
    expect(qs({ a: "1", b: null, c: "", d: 2 })).toBe("?a=1&d=2");
    expect(qs({})).toBe("");
  });
});

describe("billing checks", () => {
  const sub = (o: Partial<SubRow> & { dodo_subscription_id: string; clinic_id: string }): SubRow => ({ status: "active", created_at: ago(5), ...o });
  it("flags duplicate live subscriptions, payment trouble and plan/ledger mismatches", () => {
    const subs = [sub({ dodo_subscription_id: "s1", clinic_id: A, founding: true }), sub({ dodo_subscription_id: "s2", clinic_id: A }), sub({ dodo_subscription_id: "s3", clinic_id: B, status: "on_hold" }), sub({ dodo_subscription_id: "s4", clinic_id: "c", status: "cancelled" })];
    const issues = billingIssues(subs, [
      { id: A, plan: "active" },
      { id: B, plan: "active" },
      { id: "c", plan: "active", dodo_subscription_id: "s4" },
    ]);
    expect(issues.map((i) => [i.clinicId, i.kind])).toEqual([
      [A, "duplicate"],
      [B, "payment"],
      ["c", "mismatch"],
    ]);
    expect(foundingFromLedger(subs)).toMatchObject({ used: 1 });
    expect(billingIssues([], [{ id: A, plan: "active" }])).toEqual([]);
  });
});

describe("overview", () => {
  const ev = (name: string, daysAgo: number, props: Record<string, unknown> = {}, clinic_id: string | null = null): AdminEvent => ({ name, locale: "de", props, clinic_id, created_at: ago(daysAgo) });
  it("counts visitors, sign-ups, previews, checkouts and payments per window", () => {
    const events = [ev("landing_view", 0.1), ev("landing_view", 3), ev("landing_view", 20), ev("preview_started", 0.2, { where: "landing" }), ev("preview_step_viewed", 2, {}, A), ev("checkout_opened", 2, {}, A), ev("payment_succeeded", 2, {}, A)];
    const clinics = [{ created_at: ago(0.5) }, { created_at: ago(10) }];
    expect(periodStats(events, clinics, 1, NOW)).toEqual({ visitors: 1, signups: 1, previews: 1, checkouts: 0, paid: 0 });
    expect(periodStats(events, clinics, 7, NOW)).toEqual({ visitors: 2, signups: 1, previews: 2, checkouts: 1, paid: 1 });
    expect(periodStats(events, clinics, 30, NOW)).toMatchObject({ visitors: 3, signups: 2 });
  });
  it("sign-ups are accounts created, not only clinics that got as far as saving their profile", () => {
    const events = [ev("signup_completed", 1), ev("signup_completed", 2), ev("signup_completed", 3), ev("clinic_saved", 1, {}, A)];
    expect(periodStats(events, [{ created_at: ago(1) }], 7, NOW).signups).toBe(3);
    // Events blocked by an ad blocker: never fewer than the clinic rows.
    expect(periodStats([], [{ created_at: ago(1) }, { created_at: ago(2) }], 7, NOW).signups).toBe(2);
  });

  it("lists every open problem with the screen that fixes it; nothing when all is well", () => {
    const sys = { available: true, health: "up" as const, queues: [], stuck: [] };
    expect(openProblems({ items: [], system: sys, emailFailures: 0, billing: [], parked: 0, now: NOW })).toEqual([]);
    const p = openProblems({
      items: [item({ id: "f", status: "failed", updated_at: ago(1) }), item({ id: "g", status: "flagged", findings: ["x"], updated_at: ago(1) }), item({ id: "old", status: "failed", updated_at: ago(30) })],
      system: { available: true, health: "down", queues: [{ name: "dentvid", failed: 2 } as never], stuck: [{} as never] },
      emailFailures: 3,
      billing: [{ clinicId: A, kind: "duplicate", detail: "", subs: [] }],
      parked: 1,
      now: NOW,
    });
    expect(p.map((x) => [x.key, x.count, x.section])).toEqual([
      ["videos", 1, "videos"],
      ["flagged", 1, "videos"],
      ["worker", 1, "system"],
      ["jobs", 2, "system"],
      ["stuck", 1, "system"],
      ["parked", 1, "system"],
      ["emails", 3, "emails"],
      ["duplicates", 1, "billing"],
    ]);
    expect(openProblems({ items: [], system: { ...sys, available: false }, emailFailures: null, billing: [], parked: 0, now: NOW })[0].key).toBe("redis");
  });
});

describe("video internals", () => {
  it("reads compliance and accuracy results of a generated video and of a recording", () => {
    const gen = checkViews({
      script: { compliance: { verdict: "revise", hard: [{ rule: "guarantee", match: "guaranteed", why: "" }], issues: [{ quote: "painless", problem: "absolute", fix: "comfortable" }] }, accuracy: { verdict: "pass", issues: [] } },
      copy: { compliance: { verdict: "pass", hard: [], issues: [] } },
    });
    expect(gen.map((c) => [c.label, c.verdict])).toEqual([
      ["script · compliance", "revise"],
      ["script · accuracy", "pass"],
      ["copy · compliance", "pass"],
    ]);
    expect(gen[0].hard).toEqual(["guarantee: “guaranteed”"]);
    expect(gen[0].issues[0]).toEqual({ quote: "painless", problem: "absolute", fix: "comfortable" });
    expect(checkViews({ compliance: { verdict: "block", issues: [] } })[0]).toMatchObject({ label: "compliance", verdict: "block" });
    expect(checkViews(null)).toEqual([]);
    expect(checkViews({ weird: 1 })).toEqual([]);
  });

  it("the words: transcript, narration, else on-screen text", () => {
    expect(scriptText({ spoken: "Hello", plan: { voiceover: { text: "x" } } })).toBe("Hello");
    expect(scriptText({ plan: { voiceover: { text: "Narration" } } })).toBe("Narration");
    expect(scriptText({ plan: { voiceover: "Plain" } })).toBe("Plain");
    expect(scriptText({ plan: { scenes: [{ kind: "hook", text: "Hook", sub: "Sub" }, { kind: "list", heading: "H", items: ["a", "b"] }] } })).toBe("Hook\nSub\nH\na\nb");
    expect(scriptText({})).toBe("");
    expect(findingsList(["a", { rule: "x" }])).toEqual(["a", '{"rule":"x"}']);
  });
});

describe("email log", () => {
  it("knows which clinic and kind an idempotency key is for", () => {
    expect(emailLogFromKey(`dentvideo-welcome-${A}`)).toEqual({ clinicId: A, kind: "welcome" });
    expect(emailLogFromKey(`dentvideo-nudge_offer-${A}`)).toEqual({ clinicId: A, kind: "nudge_offer" });
    expect(emailLogFromKey(`dentvideo-payment-on_hold-${A}-2026-11-11`)).toEqual({ clinicId: A, kind: "payment_on_hold" });
    expect(emailLogFromKey("reset-123")).toBeNull();
    expect(emailLogFromKey(undefined)).toBeNull();
  });

  it("merges delivery records with lifecycle claims, once each, newest first, with the clinic's language", () => {
    const rows = emailRows(
      [
        { clinic_id: A, kind: "welcome", sent_at: ago(3) },
        { clinic_id: B, kind: "nudge_offer", sent_at: ago(2) },
      ],
      [{ id: 1, clinic_id: A, kind: "welcome", language: null, status: "failed", error: "422", created_at: ago(3) }],
      [{ id: A, created_at: ago(9), plan: "active", profile: { language: "de" } }, { id: B, created_at: ago(9), plan: "trial", profile: { language: "en" } }],
    );
    expect(rows.map((r) => [r.clinicId, r.kind, r.status, r.language])).toEqual([
      [B, "nudge_offer", "sent", "en"],
      [A, "welcome", "failed", "de"],
    ]);
  });
});
