import { describe, it, expect } from "vitest";
import { EMAIL_LANGUAGES, readyEmail } from "./email";
import { LANGUAGES } from "./profile";
import { lifecycleText } from "@/content/dentvideo-lifecycle";

describe("readyEmail", () => {
  it("speaks every language a clinic can choose", () => {
    expect(new Set(EMAIL_LANGUAGES)).toEqual(new Set(LANGUAGES.map((l) => l.code)));
  });
  it("counts ready and flagged videos and links to the library", () => {
    const m = readyEmail({ kind: "week", counts: { ready: 4, flagged: 1 }, clinicName: "Gülüş <Klinik>", language: "tr", appUrl: "https://dentvideo.com/app" })!;
    expect(m.subject).toBe("5 yeni video onayınızı bekliyor");
    expect(m.text).toContain("4 video onaya hazır");
    expect(m.text).toContain("https://dentvideo.com/app");
    expect(m.html).toContain("Gülüş &lt;Klinik&gt;");
    expect(m.html).not.toContain("<Klinik>");
  });
  it("is built for mail clients: language, preheader, a button Outlook draws, the link in plain sight", () => {
    const m = readyEmail({ kind: "week", counts: { ready: 5, flagged: 0 }, clinicName: "Praxis", language: "de", appUrl: "https://dentvideo.com/app" })!;
    expect(m.html).toContain('<html lang="de" dir="ltr">');
    expect(m.html).toContain('<meta charset="utf-8">');
    // The inbox line says what is waiting (not the first sentence of the body again).
    expect(m.html).toMatch(/display:none[^>]*>5 bereit zur Freigabe\. Nichts wird veröffentlicht/);
    expect(m.html).toContain('bgcolor="#0f5c5c"');
    // Outlook's VML button, everyone else's button, and the link written out under it.
    expect(m.html).toContain("<v:roundrect");
    expect(m.html.match(/href="https:\/\/dentvideo\.com\/app"/g)).toHaveLength(3);
    expect(m.html).not.toContain("markiert"); // no flagged line when nothing is flagged
    expect(readyEmail({ kind: "week", counts: { ready: 1, flagged: 0 }, clinicName: "x", language: "nl", appUrl: "u" })!.html).toContain('<html lang="en" dir="ltr">');
  });
  it("is signed by the DentVideo team in every language, like the other emails", () => {
    for (const language of EMAIL_LANGUAGES) {
      const signoff = lifecycleText(language).copy.signoff;
      for (const kind of ["week", "recording"] as const) {
        const m = readyEmail({ kind, counts: { ready: 2, flagged: 1 }, clinicName: "x", language, appUrl: "https://dentvideo.com/app" })!;
        expect(m.text, `${language}/${kind}`).toContain(signoff);
      }
    }
    expect(readyEmail({ kind: "week", counts: { ready: 1, flagged: 0 }, clinicName: "x", language: "en", appUrl: "u" })!.text).toContain("The DentVideo team");
  });
  it("sends nothing when nothing was made, and falls back to English", () => {
    expect(readyEmail({ kind: "week", counts: { ready: 0, flagged: 0 }, clinicName: "x", language: "tr", appUrl: "u" })).toBeNull();
    expect(readyEmail({ kind: "recording", counts: { ready: 2, flagged: 0 }, clinicName: "x", language: "nl", appUrl: "u" })!.subject).toBe("2 clips from your recording are ready");
  });
});

describe("deliveryAddress: test inboxes never get real mail", async () => {
  const { deliveryAddress, TEST_EMAIL_SINK } = await import("./email");
  it("routes QA, e2e and monitor addresses to Resend's sink", () => {
    for (const a of ["qa+appqa1@bulsulabs.com", "e2e-monitor+123@bulsulabs.com", "e2e7@example.com", "dvqa+x@bulsulabs.com"]) expect(deliveryAddress(a, {}), a).toBe(TEST_EMAIL_SINK);
  });
  it("keeps real clinics and the owner", () => {
    for (const a of ["dr.ayse@klinik.com.tr", "hello@dentvideo.com", "owner@gmail.com", "quality@clinic.de"]) expect(deliveryAddress(a, {}), a).toBe(a);
  });
  it("extra patterns from DENTVID_TEST_EMAIL_PATTERNS", () => {
    expect(deliveryAddress("tester+1@gmail.com", { DENTVID_TEST_EMAIL_PATTERNS: "tester+*@*" })).toBe(TEST_EMAIL_SINK);
  });
});

describe("sendEmail: from DentVideo, replies to hello@dentvideo.com, HTML and plain text", async () => {
  const { sendEmail } = await import("./email");
  const { vi, afterEach } = await import("vitest");
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });
  it("posts one message to Resend with the DentVideo sender, reply-to, both parts and the test-address sink", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test");
    vi.stubEnv("DENTVIDEO_EMAIL_FROM", "");
    vi.stubEnv("DENTVIDEO_EMAIL_REPLY_TO", "");
    const calls: { url: string; body: Record<string, unknown> }[] = [];
    vi.stubGlobal("fetch", async (url: string, init: { body: string }) => {
      calls.push({ url, body: JSON.parse(init.body) });
      return new Response("{}", { status: 200 });
    });
    const { sampleEmailFor } = await import("./email-samples");
    const m = sampleEmailFor("code", "tr");
    expect(await sendEmail("qa+x@bulsulabs.com", m, { log: null })).toBe(true);
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe("https://api.resend.com/emails");
    expect(calls[0].body).toMatchObject({ from: "DentVideo <hello@dentvideo.com>", reply_to: "hello@dentvideo.com", to: ["delivered@resend.dev"], subject: "DentVideo doğrulama kodunuz: 482913" });
    expect(calls[0].body.html).toBe(m.html);
    expect(calls[0].body.text).toBe(m.text);
  });
});

/* ------------------------------------------------------------ first week, short week, running late */

describe("readyEmail: the first week, a short week", async () => {
  const { DELIVERY_NOTICES } = await import("@/content/dentvideo-delivery-notices");
  const { LOCALES } = await import("@/content/dentvideo-locales");
  const { postingText } = await import("@/content/dentvideo-posting");
  const { appText, fmt } = await import("@/content/dentvideo-app");
  const { deliveryDate } = await import("./email");
  const APPROVE = "https://dentvideo.com/api/dentvideo/approve?t=x.2026-11-16.1.sig";
  const base = { kind: "week" as const, counts: { ready: 4, flagged: 1 }, clinicName: "Klinik", appUrl: "https://dentvideo.com/app" };
  /** The email's own approve-all button (email.ts COPY), which step 1 names. */
  const APPROVE_ALL: Record<string, string> = {
    en: "Approve all ready videos",
    de: "Alle fertigen Videos freigeben",
    es: "Aprobar todos los vídeos listos",
    fr: "Valider toutes les vidéos prêtes",
    tr: "Hazır videoların tümünü onaylayın",
    ja: "準備済みの動画をまとめて承認する",
    ar: "اعتماد كل الفيديوهات الجاهزة",
    pl: "Zaakceptuj wszystkie gotowe filmy",
  };
  const firstWeek = (language: string, over: Record<string, unknown> = {}) =>
    readyEmail({ ...base, language, approveUrl: APPROVE, first: true, nextDate: "2026-11-23", nudge: "both", ...over })!;

  it("in all eight languages: the welcome subject and title, three steps with the real button labels, the next Monday, the Settings nudge", () => {
    for (const l of LOCALES) {
      const n = DELIVERY_NOTICES[l].first;
      const m = firstWeek(l);
      expect(m.subject, l).toBe(n.subject);
      expect(m.html, l).toContain(`<html lang="${l}" dir="${l === "ar" ? "rtl" : "ltr"}"`);
      expect(m.text, l).toContain(n.title);
      expect(m.text, l).toContain(n.welcome);
      expect(m.text, l).toContain(n.stepsIntro);
      // Step 1 names this email's own approve-all button; step 2 the app's "Post it" on an approved video
      // (the button the welcome email names too); the nudge the app's Settings tab.
      expect(m.text, l).toContain(fmt(n.approveHere.body, { approve: APPROVE_ALL[l] }));
      expect(m.text, l).toContain(`${APPROVE_ALL[l]}: ${APPROVE}`);
      const openPost = appText(l).library.review.openPost;
      expect(m.text, l).toContain(openPost);
      expect(m.text, l).toContain(fmt(n.post.body, { post: openPost }));
      // The tap after it is described, not quoted: its label differs on the web, on a computer and in the iPhone app.
      expect(m.text, l).not.toContain(postingText(l).saveAndCopy);
      expect(m.text, l).toContain(n.paste.body);
      expect(m.text, l).toContain(fmt(n.nudge.both, { settings: appText(l).chrome.settings }));
      expect(m.text, l).toContain(fmt(n.next, { date: deliveryDate("2026-11-23", l)! }));
      // The steps come before the videos, the date after them; nothing left unfilled.
      expect(m.text, l).not.toMatch(/\{\w+\}|undefined|NaN/);
      expect(m.text.indexOf(n.stepsIntro), l).toBeLessThan(m.text.indexOf(fmt(n.next, { date: deliveryDate("2026-11-23", l)! })));
    }
  });

  it("the next delivery date is the Monday given, in each language's own date format", () => {
    expect(deliveryDate("2026-11-23", "en")).toBe("Monday 23 November");
    expect(deliveryDate("2026-11-23", "de")).toBe("Montag, 23. November");
    expect(deliveryDate("2026-11-23", "tr")).toBe("23 Kasım Pazartesi");
    expect(deliveryDate("2026-11-23", "ar")).toMatch(/23/); // Western digits, as dateLocale gives Arabic
    expect(deliveryDate("not a date", "en")).toBeNull();
    // An English clinic in the US, Canada, Australia or New Zealand reads its own date order; others are unchanged.
    expect(deliveryDate("2026-11-23", "en", "US")).toBe("Monday, November 23");
    expect(deliveryDate("2026-11-23", "en", "GB")).toBe("Monday 23 November");
    expect(deliveryDate("2026-11-23", "de", "US")).toBe("Montag, 23. November");
    expect(firstWeek("en", { country: "US" }).text).toContain("Monday, November 23");
    expect(firstWeek("en").text).toContain("Your next week of videos arrives on Monday 23 November.");
    // No date, no line (never an empty or made-up one).
    expect(firstWeek("en", { nextDate: null }).text).not.toContain("arrives on");
  });

  it("the nudge is optional and names only what is missing", () => {
    expect(firstWeek("en", { nudge: null }).text).not.toContain("If you like");
    expect(firstWeek("en", { nudge: "handle" }).text).toContain("If you like, add your Instagram or TikTok handle in Settings.");
    expect(firstWeek("en", { nudge: "handle" }).text).not.toContain("closing line");
    expect(firstWeek("en", { nudge: "closingLine" }).text).toContain("If you like, add your own closing line in Settings.");
    expect(firstWeek("de", { nudge: "closingLine" }).text).toContain(`unter ${appText("de").chrome.settings}`);
  });

  it("step 1 fits what the email offers: the approve-all button, else the app, else a look at the marked ones", () => {
    const en = DELIVERY_NOTICES.en.first;
    expect(firstWeek("en").text).toContain("“Approve all ready videos” below does it in one tap.");
    const noLink = firstWeek("en", { approveUrl: null });
    expect(noLink.text).toContain(en.approveInApp.body);
    expect(noLink.text).not.toContain("below does it");
    const allMarked = firstWeek("en", { counts: { ready: 0, flagged: 3 } });
    expect(allMarked.text).toContain(en.lookFirst.body);
    expect(allMarked.text).not.toContain("Approve all ready videos");
  });

  it("uses the real count, never a promised one", () => {
    const m = firstWeek("en", { counts: { ready: 2, flagged: 1 } });
    expect(m.subject).toBe("Your first DentVideo videos are ready");
    expect(m.text).toContain("2 ready to approve");
    expect(m.text).not.toMatch(/\bfive\b(?! videos did)|\b5 (new )?videos\b/);
  });

  it("a routine week reads as before: no welcome, no steps, no date, no nudge", () => {
    const m = readyEmail({ ...base, language: "en", approveUrl: APPROVE })!;
    expect(m.subject).toBe("5 new videos are ready for your review");
    expect(m.text).not.toContain("Welcome");
    expect(m.text).not.toContain("three steps");
    expect(m.text).not.toContain("arrives on");
    // first is for weeks only: a recording never gets it.
    expect(readyEmail({ ...base, kind: "recording", language: "en", first: true, nextDate: "2026-11-23", nudge: "both" })!.text).not.toContain("Welcome");
  });

  it("a short week says, once and plainly, how many were left out and why, in all eight languages", () => {
    for (const l of LOCALES) {
      for (const missing of [1, 2, 3, 4] as const) {
        for (const missingReason of ["checks", "unfinished"] as const) {
          const m = readyEmail({ ...base, counts: { ready: 5 - missing, flagged: 0 }, language: l, missing, missingReason })!;
          const line = DELIVERY_NOTICES[l].short[missingReason][missing];
          const other = DELIVERY_NOTICES[l].short[missingReason === "checks" ? "unfinished" : "checks"][missing];
          const at = `${l} ${missing} ${missingReason}`;
          expect(m.text, at).toContain(line);
          expect(m.text, at).not.toContain(other);
          expect(m.text.split(line).length - 1, at).toBe(1);
          expect(m.html, at).toContain(`<html lang="${l}"`);
        }
      }
    }
    expect(readyEmail({ ...base, counts: { ready: 4, flagged: 0 }, language: "en", missing: 1, missingReason: "checks" })!.text).toContain("One of this week's five videos did not pass our checks, so we left it out rather than send you something wrong.");
    expect(readyEmail({ ...base, counts: { ready: 2, flagged: 0 }, language: "en", missing: 3, missingReason: "checks" })!.text).toContain("Three of this week's five videos did not pass our checks");
    expect(readyEmail({ ...base, counts: { ready: 4, flagged: 0 }, language: "en", missing: 1, missingReason: "unfinished" })!.text).toContain("One of this week's five videos could not be finished to our standard, so we left it out.");
    // Polish and Arabic in their own forms, the number written out.
    expect(readyEmail({ ...base, language: "pl", missing: 3, missingReason: "checks" })!.text).toContain("Trzy z pięciu filmów na ten tydzień nie przeszły");
    expect(readyEmail({ ...base, language: "ar", missing: 2, missingReason: "checks" })!.text).toContain("لم يجتز فيديوهان");
  });

  it("without a reason the line blames nothing it cannot prove: the plainer 'could not be finished' wording", () => {
    const m = readyEmail({ ...base, counts: { ready: 3, flagged: 0 }, language: "en", missing: 2 })!;
    expect(m.text).toContain(DELIVERY_NOTICES.en.short.unfinished[2]);
    expect(m.text).not.toContain("our checks");
  });

  it("a full week, a nonsense count or a recording gets no short-week line, and nothing promises a remake or credit", () => {
    for (const missing of [0, 5, 7, -1, 1.5, Number.NaN]) {
      expect(readyEmail({ ...base, language: "en", missing, missingReason: "checks" })!.text, String(missing)).not.toMatch(/of this week's five videos/);
    }
    expect(readyEmail({ ...base, kind: "recording", language: "en", missing: 2, missingReason: "checks" })!.text).not.toMatch(/of this week's five videos/);
    for (const missingReason of ["checks", "unfinished"] as const) {
      const m = readyEmail({ ...base, language: "en", missing: 2, missingReason, first: true, nextDate: "2026-11-23", nudge: "both", approveUrl: APPROVE })!;
      expect(m.text).not.toMatch(/remake|redo|credit|refund|free|discount|compensat|guarant/i);
    }
  });

  it("Italian and Portuguese clinics (English app and welcome) get these emails whole in English, never half translated; their routine email stays theirs", () => {
    for (const l of ["it", "pt"]) {
      const first = firstWeek(l);
      expect(first.html, l).toContain('<html lang="en" dir="ltr"');
      expect(first.subject, l).toBe(DELIVERY_NOTICES.en.first.subject);
      expect(first.text, l).toContain("Review the videos");
      const short = readyEmail({ ...base, language: l, missing: 1 })!;
      expect(short.html, l).toContain('<html lang="en" dir="ltr"');
      expect(short.subject, l).toBe("5 new videos are ready for your review");
      expect(readyEmail({ ...base, language: l })!.html, l).toContain(`<html lang="${l}"`);
    }
  });

});

describe("delayEmail: one calm 'running late' note", async () => {
  const { delayEmail } = await import("./email");
  const { esc } = await import("./email-layout");
  const { DELIVERY_NOTICES } = await import("@/content/dentvideo-delivery-notices");
  const { LOCALES } = await import("@/content/dentvideo-locales");

  it("late and first-late in all eight languages, queued or not: its subject, title, body and 'we will email you', signed and transactional", () => {
    for (const l of LOCALES) {
      for (const kind of ["late", "first-late"] as const) {
        for (const queued of [true, false]) {
          const n = kind === "late" ? DELIVERY_NOTICES[l].late : DELIVERY_NOTICES[l].firstLate;
          const t = queued ? n.queued : n.held;
          const other = queued ? n.held : n.queued;
          const m = delayEmail({ kind, queued, clinicName: "Gülüş <Klinik>", language: l });
          const at = `${l} ${kind} ${queued ? "queued" : "held"}`;
          expect(m.subject, at).toBe(n.subject);
          expect([...m.subject].length, at).toBeLessThanOrEqual(50);
          expect(m.html, at).toContain(`<html lang="${l}" dir="${l === "ar" ? "rtl" : "ltr"}"`);
          expect(m.html, at).toContain(`>${esc(t.preheader)}&#847;`);
          for (const s of [t.title, t.body, n.next]) expect(m.text, at).toContain(s);
          // Only the wording that fits: never the other body.
          expect(m.text, at).not.toContain(other.body);
          expect(m.html, at).toContain("Gülüş &lt;Klinik&gt;");
          expect(m.html, at).not.toContain("<Klinik>");
          // Nothing to do, so nothing to click: no button, no unsubscribe (it is about their own week), a person to reply to.
          expect(m.html, at).not.toContain("v:roundrect");
          expect(m.html, at).not.toContain("unsubscribe");
          expect(m.text, at).toContain("hello@dentvideo.com");
          expect(m.text, at).not.toMatch(/\{\w+\}|undefined|NaN/);
        }
      }
    }
    expect(delayEmail({ kind: "late", clinicName: "x", language: "en" }).subject).toBe("This week's videos are running late");
    expect(delayEmail({ kind: "first-late", clinicName: "x", language: "en" }).subject).toBe("Your first videos are taking a little longer");
  });

  it("says 'queued and on its way' only when told the week is queued; by default it says we were alerted and are on it", () => {
    const queued = delayEmail({ kind: "first-late", queued: true, clinicName: "x", language: "en" });
    expect(queued.text).toContain("It is queued and on its way");
    expect(queued.text).toContain("Your first videos are on their way");
    const held = [
      delayEmail({ kind: "first-late", clinicName: "x", language: "en" }),
      delayEmail({ kind: "first-late", queued: false, clinicName: "x", language: "en" }),
      delayEmail({ kind: "late", clinicName: "x", language: "en" }),
    ];
    for (const m of held) {
      expect(m.text).toContain("We have been alerted and are on it, and nothing extra is charged.");
      expect(m.text).not.toMatch(/queued|on (its|their) way/);
      expect(m.html).not.toMatch(/queued|on (its|their) way/);
    }
  });

  it("Italian, Portuguese and unknown languages get the English note", () => {
    for (const l of ["it", "pt", "nl"]) {
      const m = delayEmail({ kind: "late", clinicName: "x", language: l });
      expect(m.html, l).toContain('<html lang="en" dir="ltr"');
      expect(m.subject, l).toBe(DELIVERY_NOTICES.en.late.subject);
    }
  });
});
