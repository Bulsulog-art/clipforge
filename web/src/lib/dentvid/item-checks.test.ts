import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import type { SupabaseClient } from "@supabase/supabase-js";
import { checkedOf, linesFromCues, markQuoted, quotesOf, scriptOf, sentences } from "./item-checks";
import { loadItems } from "./items";
import { RULE_COUNTRIES, ruleCountry } from "./rule-countries";
import { RULE_MARKETS } from "@/content/dentvideo-showcase";

/**
 * The "checked" line and the script, from rows shaped the way the worker
 * stores them (worker/src/dentvid/rows.ts rowFromPackage / rowFromClip; the
 * reviews' results are dental/week.ts `checks: { script, copy }`). The worker
 * anchors these fixtures rely on are read from its source at the end, so a
 * change there breaks this file instead of the line quietly claiming more.
 */

const ROOT = path.resolve(__dirname, "../../../..");
const worker = (f: string) => fs.readFileSync(path.join(ROOT, "worker/src", f), "utf8");

const pass = { compliance: { verdict: "pass", hard: [], issues: [] }, accuracy: { verdict: "pass", issues: [] } };
const cleanQa = { ok: true, issues: [], stats: { durationSec: 32, width: 1080, height: 1920, hasAudio: true, meanVolumeDb: -18, longestSilenceSec: 0.8, blackSec: 0 } };
const pauseQa = { ok: false, issues: ["3.1s of silence (max 3s)"], stats: { ...cleanQa.stats, longestSilenceSec: 3.1 } };

/** A ready video we wrote, as rowFromPackage stores it after both reviews and a clean measurement. */
const ready = (over: Record<string, unknown> = {}) => ({
  kind: "generated",
  status: "ready",
  checks: { script: pass, copy: pass },
  qa: cleanQa,
  findings: [] as string[],
  ...over,
});

describe("checkedOf: says 'checked' only where the stored results prove it", () => {
  it("a ready video whose script and caption passed both reviews, measured clean: all three parts", () => {
    expect(checkedOf(ready())).toEqual({ picture: true });
  });

  it("flagged for a pause: the reviews passed, so they are named; picture and sound is not (the reason says what to check)", () => {
    expect(checkedOf(ready({ status: "flagged", qa: pauseQa, findings: ["[dv:pause] quality: 3.1s of silence (max 3s)"] }))).toEqual({ picture: false });
    // A row from before the codes says the same in plain words.
    expect(checkedOf(ready({ status: "flagged", qa: pauseQa, findings: ["quality: 3.1s of silence (max 3s)"] }))).toEqual({ picture: false });
    expect(checkedOf(ready({ status: "flagged", findings: ["[dv:technical] quality: resolution 720x1280, expected 1080x1920"] }))).toEqual({ picture: false });
  });

  it("never anything when the picture and sound measurement could not run ([dv:unchecked], or the old untagged words)", () => {
    expect(checkedOf(ready({ status: "flagged", qa: null, findings: ["[dv:unchecked] qa unavailable"] }))).toBeUndefined();
    expect(checkedOf(ready({ status: "flagged", qa: null, findings: ["qa unavailable"] }))).toBeUndefined();
    // Even with a report on the row, the finding wins: nobody vouches for this file.
    expect(checkedOf(ready({ status: "flagged", findings: ["[dv:unchecked] qa unavailable", "[dv:pause] quality: 3.2s of silence (max 3s)"] }))).toBeUndefined();
  });

  it("no measurement stored, or one that cannot be read: nothing, as for '[dv:unchecked]' (QA never ran on this file)", () => {
    // Rows stored before '[dv:unchecked]' existed: inspectVideo threw, the row said "ready" with no qa.
    for (const qa of [undefined, null, { ok: true }, { issues: [] }, { ok: "true", issues: [] }, { ok: 1, issues: [] }, { ok: true, issues: "none" }, "ok", [], true]) {
      expect(checkedOf(ready({ qa })), JSON.stringify(qa)).toBeUndefined();
    }
  });

  it("a measurement that ran and found something: the reviews only", () => {
    expect(checkedOf(ready({ qa: { ...cleanQa, ok: false } }))).toEqual({ picture: false });
    expect(checkedOf(ready({ qa: { ...cleanQa, issues: ["too long: 95.0s (max 90s)"] } }))).toEqual({ picture: false });
    expect(checkedOf(ready({ status: "flagged", qa: pauseQa, findings: ["[dv:audio] quality: effectively silent in places"] }))).toEqual({ picture: false });
  });

  it("fails closed on any finding that is not a QA measurement: wording, an opening line, a reviewer note, a hidden technical marker, a code it does not know", () => {
    for (const finding of [
      '[dv:wording] "painless": absolute claim',
      '[dv:opening] hook removed: "Painless!"',
      '"painless": promise',
      "[dv:voice] a code the web does not know yet",
      "[dv:xyz] anything",
      "[dv:skipped] did not meet the bar",
      "the video file is missing",
      "could not store the render",
      "something a reviewer wrote",
    ]) {
      expect(checkedOf(ready({ status: "flagged", findings: [finding] })), finding).toBeUndefined();
      // Next to a QA finding as well: the unknown one still hides the line.
      expect(checkedOf(ready({ status: "flagged", qa: pauseQa, findings: ["[dv:pause] quality: 3.1s of silence (max 3s)", finding] })), finding).toBeUndefined();
    }
  });

  it("after a photo update (or the owner's retry) the file was rendered again without being measured: picture and sound is not claimed", () => {
    expect(checkedOf(ready({ restyle_requested_at: "2026-11-20T10:00:00Z" }))).toEqual({ picture: false });
    expect(checkedOf(ready({ restyle_requested_at: null }))).toEqual({ picture: true });
  });

  it("nothing when either review of the script or of the caption did not pass, or is missing", () => {
    const revise = { ...pass, compliance: { verdict: "revise", hard: [], issues: [] } };
    const blocked = { ...pass, accuracy: { verdict: "block", issues: [] } };
    for (const checks of [
      { script: revise, copy: pass },
      { script: pass, copy: revise },
      { script: blocked, copy: pass },
      { script: pass, copy: blocked },
      { script: pass },
      { copy: pass },
      { script: { compliance: pass.compliance }, copy: pass },
      { script: { accuracy: pass.accuracy }, copy: pass },
      { script: { compliance: { verdict: "PASS" }, accuracy: pass.accuracy }, copy: pass },
      {},
      null,
      undefined,
      "pass",
      [],
    ]) {
      expect(checkedOf(ready({ checks })), JSON.stringify(checks)).toBeUndefined();
    }
  });

  it("nothing for a topic not made, a failed or unfinished row, or a recorded clip (its caption is not reviewed, its measurement not stored)", () => {
    for (const status of ["rejected", "failed", "queued", "working"]) expect(checkedOf(ready({ status })), status).toBeUndefined();
    expect(checkedOf({ kind: "recording", status: "ready", checks: pass, findings: [] })).toBeUndefined();
    expect(checkedOf({ kind: "recording", status: "ready", checks: { script: pass, copy: pass }, qa: cleanQa, findings: [] })).toBeUndefined();
  });
});

describe("scriptOf: the narration, sentence by sentence", () => {
  const subtitles = {
    v: 1,
    source: "pauses",
    cues: [
      { start: 0, end: 2.4, text: "Bleeding gums are common." },
      { start: 2.9, end: 6.1, text: "Most of the time it starts with plaque\nalong the gum line," },
      { start: 6.1, end: 8.0, text: "and it can settle down." },
      { start: 14.24, end: 17.5, text: "See your dentist if it lasts." },
    ],
  };

  it("with stored cues: each sentence starts where its first cue does, line breaks and pieces joined", () => {
    expect(scriptOf(ready({ subtitles, plan: { language: "en", voiceover: { text: "ignored when cues exist" } } }))).toEqual([
      { text: "Bleeding gums are common.", at: 0 },
      { text: "Most of the time it starts with plaque along the gum line, and it can settle down.", at: 2.9 },
      { text: "See your dentist if it lasts.", at: 14.2 },
    ]);
  });

  it("Japanese pieces join without spaces", () => {
    const ja = { cues: [{ start: 0, end: 2, text: "歯ぐきからの出血は、\nよくあることです。" }, { start: 2.5, end: 5, text: "気になるときは" }, { start: 5, end: 7, text: "ご相談ください。" }] };
    expect(linesFromCues(ja, "ja")).toEqual([
      { text: "歯ぐきからの出血は、よくあることです。", at: 0 },
      { text: "気になるときはご相談ください。", at: 2.5 },
    ]);
  });

  it("without cues (made before subtitles existed): the stored narration in sentences, with no times it does not have", () => {
    const lines = scriptOf(ready({ plan: { language: "en", voiceover: { text: "Bleeding gums are common.  Most of the time it is plaque! Ask us?" } } }));
    expect(lines).toEqual([{ text: "Bleeding gums are common." }, { text: "Most of the time it is plaque!" }, { text: "Ask us?" }]);
    expect(lines!.some((l) => "at" in l)).toBe(false);
  });

  it("a video we wrote never has a marked sentence: its findings (a pause, the sound) say nothing of where", () => {
    const lines = scriptOf(ready({ status: "flagged", qa: pauseQa, findings: ["[dv:pause] quality: 3.1s of silence (max 3s)"], subtitles }));
    expect(lines!.length).toBe(3);
    expect(lines!.some((l) => l.marked)).toBe(false);
  });

  it("nothing for rows with nothing to read, or not made", () => {
    expect(scriptOf(ready())).toBeUndefined();
    expect(scriptOf(ready({ plan: { voiceover: { text: "   " } } }))).toBeUndefined();
    expect(scriptOf(ready({ status: "rejected", subtitles }))).toBeUndefined();
    expect(scriptOf(ready({ status: "working", subtitles }))).toBeUndefined();
    expect(scriptOf(ready({ subtitles: { cues: [{ start: 3, end: 1, text: "Backwards." }] } }))).toBeUndefined();
  });

  it("a decimal point or a title does not end a sentence (a transcript often has 'Dr.')", () => {
    expect(sentences("Dr. Smith says brush for 2.5 minutes. Floss daily.")).toEqual(["Dr. Smith says brush for 2.5 minutes.", "Floss daily."]);
    expect(sentences("Mrs. Jones and Prof. Lee agree, e.g. on fluoride. Ask us.")).toEqual(["Mrs. Jones and Prof. Lee agree, e.g. on fluoride.", "Ask us."]);
    expect(sentences("Putzen Sie z.B. zweimal täglich ca. 2 Minuten. Fertig.")).toEqual(["Putzen Sie z.B. zweimal täglich ca. 2 Minuten.", "Fertig."]);
    expect(sentences("Op. Dr. Ayşe Yılmaz ve Dt. Can anlatıyor. Sorularınızı bekliyoruz.")).toEqual(["Op. Dr. Ayşe Yılmaz ve Dt. Can anlatıyor.", "Sorularınızı bekliyoruz."]);
    expect(sentences("Radzi lek. dent. Anna Nowak. Proszę pytać.")).toEqual(["Radzi lek. dent. Anna Nowak.", "Proszę pytać."]);
    expect(sentences("La Dra. García lo explica. Pregúntanos.")).toEqual(["La Dra. García lo explica.", "Pregúntanos."]);
    // A real end stays an end: a single letter, an acronym, an ellipsis, and the end of the text.
    expect(sentences("Take vitamin D. It helps.")).toEqual(["Take vitamin D.", "It helps."]);
    expect(sentences("This matters for patients with MS. Ask us.")).toEqual(["This matters for patients with MS.", "Ask us."]);
    expect(sentences("Wait... really? Yes.")).toEqual(["Wait...", "really?", "Yes."]);
    expect(sentences("Brush for 2. Then floss.")).toEqual(["Brush for 2.", "Then floss."]);
    expect(sentences("See your Dr.")).toEqual(["See your Dr."]);
    expect(sentences("歯みがきは2.5分。毎日です。")).toEqual(["歯みがきは2.5分。", "毎日です。"]);
  });

  it("with stored cues: a cue cut at a decimal point or after a title does not end the sentence either", () => {
    const cues = {
      cues: [
        { start: 0, end: 0.6, text: "Dr." },
        { start: 0.6, end: 2.9, text: "Smith says brush for 2." },
        { start: 2.9, end: 4, text: "5 minutes." },
        { start: 4.4, end: 6, text: "Floss daily." },
        { start: 6.2, end: 7, text: "Brush for 2." },
        { start: 7.3, end: 8, text: "Then floss." },
      ],
    };
    expect(linesFromCues(cues, "en")).toEqual([
      { text: "Dr. Smith says brush for 2.5 minutes.", at: 0 },
      { text: "Floss daily.", at: 4.4 },
      { text: "Brush for 2.", at: 6.2 },
      { text: "Then floss.", at: 7.3 },
    ]);
  });

  it("a very long narration is cut to a readable length", () => {
    const text = Array.from({ length: 200 }, (_, n) => `Sentence number ${n} is here.`).join(" ");
    const lines = scriptOf(ready({ plan: { voiceover: { text } } }))!;
    expect(lines.length).toBeLessThanOrEqual(80);
    expect(lines.reduce((n, l) => n + l.text.length, 0)).toBeLessThanOrEqual(4000);
  });
});

describe("a recorded clip flagged for its wording points at the words its review quoted", () => {
  const spoken = "Implants are painless for everyone. You will be eating normally the same day. Ask us what suits you.";
  const flaggedChecks = {
    compliance: { verdict: "revise", hard: [{ match: "painless", why: "absolute claim", rule: "painless" }], issues: [] },
    accuracy: { verdict: "revise", issues: [{ quote: "“You will be eating normally the same day”", problem: "varies", fix: "Most people…" }] },
  };
  const clip = (over: Record<string, unknown> = {}) => ({
    kind: "recording",
    status: "flagged",
    spoken,
    checks: flaggedChecks,
    findings: ['[dv:wording] "painless": absolute claim', '[dv:wording] "You will be eating normally the same day": varies → Most people…'],
    ...over,
  });

  it("marks exactly the sentences that hold the quoted words", () => {
    expect(scriptOf(clip())).toEqual([
      { text: "Implants are painless for everyone.", marked: true },
      { text: "You will be eating normally the same day.", marked: true },
      { text: "Ask us what suits you." },
    ]);
  });

  it("a quote that is not in the words marks nothing, rather than guessing", () => {
    const off = { compliance: { verdict: "revise", hard: [], issues: [{ quote: "guaranteed results", problem: "x", fix: "y" }] }, accuracy: { verdict: "pass", issues: [] } };
    expect(scriptOf(clip({ checks: off }))!.some((l) => l.marked)).toBe(false);
  });

  it("marks nothing when the clip is not flagged for its wording (ready, or only its opening line was taken out)", () => {
    expect(scriptOf(clip({ status: "ready", findings: [] }))!.some((l) => l.marked)).toBe(false);
    expect(scriptOf(clip({ findings: ['[dv:opening] hook removed — "Painless!": absolute'] }))!.some((l) => l.marked)).toBe(false);
  });

  it("a quote over two sentences marks both; very short quotes (a letter or two) mark nothing", () => {
    const lines = sentences("Brush twice. Floss once. Smile.").map((text) => ({ text }));
    expect(markQuoted(lines, quotesOf({ accuracy: { issues: [{ quote: "Brush twice. Floss once." }] } })).map((l) => !!l.marked)).toEqual([true, true, false]);
    expect(quotesOf({ compliance: { hard: [{ match: "a" }], issues: [{ quote: "" }, { quote: 3 }] } })).toEqual([]);
  });

  const marks = (text: string, review: unknown) => markQuoted(sentences(text).map((t) => ({ text: t })), quotesOf(review)).map((l) => !!l.marked);

  it("whole words only, as the hard rules find them: 'cure' never marks 'secure', 'yes' never marks 'eyes'", () => {
    expect(marks("This cure works. Keep your teeth secure.", { compliance: { hard: [{ match: "cure" }] } })).toEqual([true, false]);
    expect(marks("Keep your teeth secure. Ask us.", { compliance: { hard: [{ match: "cure" }] } })).toEqual([false, false]);
    expect(marks("Your eyes may water. Yes, it is safe.", { compliance: { issues: [{ quote: "yes" }] } })).toEqual([false, true]);
    expect(marks("Die Behandlung ist schmerzfrei. Sie ist frei von Risiken.", { compliance: { hard: [{ match: "frei" }] } })).toEqual([false, true]);
    // Arabic and accented words have edges too.
    expect(marks("العلاج بدون ألم. اسألونا.", { compliance: { hard: [{ match: "بدون ألم" }] } })).toEqual([true, false]);
  });

  it("a short sentence is marked only where the quote is, not because a quote elsewhere holds its words", () => {
    const text = "Is a root canal painful? Absolutely. With modern anaesthesia it is absolutely painless today.";
    expect(sentences(text)).toHaveLength(3);
    expect(marks(text, { compliance: { issues: [{ quote: "it is absolutely painless today" }] } })).toEqual([false, false, true]);
    for (const short of ["Exactly.", "Of course.", "Okay."]) {
      expect(marks(`${short} We say it is exactly of course okay painless.`, { compliance: { issues: [{ quote: "exactly of course okay painless" }] } }), short).toEqual([false, true]);
    }
    // The quote that really is that short sentence still marks it.
    expect(marks(text, { compliance: { issues: [{ quote: "Absolutely." }] } })).toEqual([false, true, true]);
  });

  it("Japanese: a quote in 「」 is found without its brackets, also over two sentences; a quote not in the words marks nothing", () => {
    const text = "インプラントは誰にでも痛みがありません。ご相談ください。";
    expect(sentences(text)).toEqual(["インプラントは誰にでも痛みがありません。", "ご相談ください。"]);
    expect(marks(text, { compliance: { issues: [{ quote: "「誰にでも痛みがありません」" }] } })).toEqual([true, false]);
    expect(marks(text, { compliance: { issues: [{ quote: "『痛みがありません。ご相談』" }] } })).toEqual([true, true]);
    expect(marks(text, { compliance: { issues: [{ quote: "「必ず白くなります」" }] } })).toEqual([false, false]);
  });
});

describe("loadItems carries both to the page", () => {
  /** Enough of the query builder for loadItems: every dentvid_items read answers from `rows`, change requests with none. */
  function fakeDb(rows: Record<string, unknown>[]) {
    const from = (table: string) => {
      let out = table === "dentvid_items" ? [...rows] : [];
      let limit = Infinity;
      let asc: boolean | null = null;
      const q = {
        select: () => q,
        eq: (c: string, v: unknown) => ((out = out.filter((r) => r[c] === v)), q),
        in: (c: string, vs: unknown[]) => ((out = out.filter((r) => vs.includes(r[c]))), q),
        lt: (c: string, v: string) => ((out = out.filter((r) => String(r[c]) < v)), q),
        not: () => q,
        order: (c: string, o?: { ascending?: boolean }) => {
          if (c === "week_of" && asc === null) asc = o?.ascending !== false;
          return q;
        },
        limit: (n: number) => ((limit = n), q),
        then: <T,>(resolve: (v: { data: unknown[]; error: null }) => T) => {
          const sorted = asc === null ? out : [...out].sort((a, b) => (String(a.week_of) < String(b.week_of) ? -1 : 1) * (asc ? 1 : -1));
          return Promise.resolve(resolve({ data: sorted.slice(0, limit), error: null }));
        },
      };
      return q;
    };
    return {
      from,
      storage: { from: () => ({ createSignedUrls: async (paths: string[]) => ({ data: paths.map((p) => ({ path: p, signedUrl: `https://signed/${p}` })) }) }) },
    } as unknown as SupabaseClient;
  }
  const WEEK = "2026-11-23";
  const row = (id: string, over: Record<string, unknown> = {}) => ({
    id,
    owner_id: "o1",
    approval: "pending",
    title: id,
    week_of: WEEK,
    created_at: `2026-11-23T08:00:${String(id.length).padStart(2, "0")}Z`,
    copy: { caption: "Two minutes, twice a day.", hashtags: [] },
    video_path: `o1/${id}.mp4`,
    thumb_path: null,
    shoot_card: null,
    plan: { language: "en", voiceover: { text: "Bleeding gums are common. Ask us." } },
    ...ready(),
    ...over,
  });

  it("a ready video gets its checked parts and its script; an unmeasured one gets neither claim", async () => {
    const { items } = await loadItems(fakeDb([row("a"), row("b", { status: "flagged", qa: null, findings: ["[dv:unchecked] qa unavailable"] })]), "o1", { now: new Date("2026-11-24T10:00:00Z") });
    const a = items.find((i) => i.id === "a")!;
    const b = items.find((i) => i.id === "b")!;
    expect(a.checked).toEqual({ picture: true });
    expect(a.script).toEqual([{ text: "Bleeding gums are common." }, { text: "Ask us." }]);
    expect(b.checked).toBeUndefined();
    expect("checked" in b).toBe(false);
    expect(b.reasons).toEqual(["unchecked"]);
    // The script is still there to read: it is the words, not a claim.
    expect(b.script).toHaveLength(2);
  });

  it("only videos waiting for a decision carry their script (the review shows it only then), so the page and the iPhone list stay light", async () => {
    const { items } = await loadItems(
      fakeDb([
        row("pending"),
        row("flagged", { status: "flagged", qa: pauseQa, findings: ["[dv:pause] quality: 3.1s of silence (max 3s)"] }),
        row("approved", { approval: "approved" }),
        row("declined", { approval: "rejected" }),
        row("notmade", { status: "rejected", video_path: null }),
      ]),
      "o1",
      { now: new Date("2026-11-24T10:00:00Z") },
    );
    const by = (id: string) => items.find((i) => i.id === id)!;
    expect(by("pending").script).toHaveLength(2);
    expect(by("flagged").script).toHaveLength(2);
    for (const id of ["approved", "declined", "notmade"]) expect("script" in by(id), id).toBe(false);
    // Every decided video still says what was checked.
    expect(by("approved").checked).toEqual({ picture: true });
    expect(by("declined").checked).toEqual({ picture: true });
  });

  it("decided videos never use up the scripts of the ones waiting; a library of years of undecided weeks is still held to forty", async () => {
    const decided = Array.from({ length: 60 }, (_, n) => row(`d${String(n).padStart(3, "0")}`, { approval: "approved" }));
    const waiting = Array.from({ length: 45 }, (_, n) => row(`w${String(n).padStart(3, "0")}`));
    const { items } = await loadItems(fakeDb([...decided, ...waiting]), "o1", { now: new Date("2026-11-24T10:00:00Z") });
    expect(items).toHaveLength(105);
    expect(items.filter((i) => i.script).length).toBe(40);
    expect(items.filter((i) => i.script).every((i) => i.approval === "pending")).toBe(true);
    expect(items.every((i) => i.checked?.picture === true)).toBe(true);
  });
});

describe("the worker still stores what these rules read", () => {
  it("a video's reviews as checks.script and checks.copy, its measurement as qa, and '[dv:unchecked]' when that could not run", () => {
    expect(worker("dental/week.ts")).toContain("checks: { script: script.checks, copy: post.checks }");
    expect(worker("dental/week.ts")).toMatch(/export type Checks = \{ compliance: ComplianceResult; accuracy: AccuracyResult \}/);
    expect(worker("dental/compliance.ts")).toMatch(/verdict: "pass" \| "revise" \| "block"/);
    const rows = worker("dentvid/rows.ts");
    expect(rows).toContain("checks: pkg.checks,");
    expect(rows).toContain("qa: pkg.qa,");
    expect(rows).toContain('status: findings.length ? "flagged" : "ready"');
    expect(worker("dentvid/reasons.ts")).toContain('export const UNCHECKED_FINDING = tagReason("unchecked", QA_UNAVAILABLE);');
    expect(worker("dentvid/reasons.ts")).toContain('export const QA_UNAVAILABLE = "qa unavailable";');
  });

  it("a photo update renders a new file without measuring it (why 'picture and sound' is not claimed after one; relax checkedOf if this changes)", () => {
    const jobs = worker("dentvid/jobs.ts");
    const start = jobs.indexOf("export async function runDentvidRestyle");
    expect(start).toBeGreaterThan(0);
    const end = jobs.indexOf("\nexport ", start + 10);
    const body = jobs.slice(start, end > start ? end : undefined);
    expect(body).toContain("renderPlan(");
    expect(body).not.toMatch(/inspectVideo|\bqa:/);
  });

  it("a recorded clip's caption is written after its reviews, from what was said, and is not reviewed itself", () => {
    const rec = worker("dental/recording.ts");
    expect(rec).toContain("checks: { compliance, accuracy },");
    expect(rec).toMatch(/const compliance = await reviewCompliance\(deps\.client, profile, spoken\)/);
  });
});

describe("the countries with their own rules in the advertising review (the line says 'advertising rules' there, 'general' elsewhere)", () => {
  const locale = worker("dental/locale.ts");
  const body = locale.slice(locale.indexOf("export function marketRules"), locale.indexOf("export function captionRules"));
  const briefed = new Set([...body.matchAll(/c === "([A-Z]{2})"/g)].map((m) => m[1]));
  const gcc = [...(locale.match(/const GCC = \[([^\]]+)\]/)?.[1] ?? "").matchAll(/"([A-Z]{2})"/g)].map((m) => m[1]);

  it("the worker's briefed markets plus the Gulf states, and the help center's list", () => {
    expect(body).toContain("GCC.includes(c)");
    expect(gcc.length).toBe(6);
    expect(new Set(RULE_COUNTRIES)).toEqual(new Set([...briefed, ...gcc]));
    const help = RULE_MARKETS.flatMap((m) => (m.code === "GULF" ? gcc : [m.code]));
    expect(new Set(RULE_COUNTRIES)).toEqual(new Set(help));
  });

  it("reads codes the way the reviewer does (uk is GB, any case); anything else has no rules of its own", () => {
    expect(ruleCountry("de")).toBe("DE");
    expect(ruleCountry(" uk ")).toBe("GB");
    expect(ruleCountry("AE")).toBe("AE");
    for (const c of ["FR", "IT", "NL", "", null, undefined, "Germany"]) expect(ruleCountry(c), String(c)).toBeNull();
  });
});
