import { isInternalEmail } from "./internal-traffic";
/**
 * "Your videos are ready for your review" — the service email every paying
 * clinic gets — and the Resend sender all DentVideo mail goes through.
 * Lifecycle mail (welcome, reminders) is in lifecycle-email.ts.
 *
 * Plain, short and in the clinic's language. It says how many videos are
 * ready and how many need a look, and links straight to the library. It
 * never contains the videos themselves or anything a patient could be
 * identified from — the library is behind the clinic's login.
 */

import { helpCenterLink, renderEmail, type Block, type Brand, type Rendered, type Thumb, type VideoRow } from "./email-layout";
import { postingText } from "@/content/dentvideo-posting";
import { lifecycleText } from "@/content/dentvideo-lifecycle";
import { appText, countText, fmt } from "@/content/dentvideo-app";
import { deliveryNoticesText, hasDeliveryNotices, type DeliveryNotices } from "@/content/dentvideo-delivery-notices";
import { dateLocale } from "./app-ui";
import type { Locale } from "@/content/dentvideo-locales";
import { WEEK_VIDEOS } from "./week-job";

export type ReadyKind = "week" | "recording";
export type ReadyCounts = { ready: number; flagged: number };

type Copy = {
  weekSubject: (n: number) => string;
  recordingSubject: (n: number) => string;
  hello: (clinic: string) => string;
  weekBody: string;
  recordingBody: string;
  readyLine: (n: number) => string;
  flaggedLine: (n: number) => string;
  approval: string;
  button: string;
  footer: string;
  weekTitle: string;
  recordingTitle: string;
  approveAsk: string;
  approveAll: string;
};

const COPY: Record<string, Copy> = {
  en: {
    weekSubject: (n) => `${n} new videos are ready for your review`,
    recordingSubject: (n) => `${n} clips from your recording are ready`,
    hello: (c) => `Hello ${c},`,
    weekBody: "This week's patient-education videos are made and software-checked; the final say is yours.",
    recordingBody: "We turned your recording into short captioned clips.",
    readyLine: (n) => `${n} ready to approve`,
    flaggedLine: (n) => `${n} marked for a quick look, with the reason`,
    approval: "Nothing is published until you approve it.",
    button: "Review the videos",
    footer: "You get this email because your clinic uses DentVideo.",
    weekTitle: "This week's videos are ready",
    recordingTitle: "Your clips are ready",
    approveAsk: "Already happy with the ready ones?",
    approveAll: "Approve all ready videos",
  },
  de: {
    weekSubject: (n) => `${n} neue Videos warten auf Ihre Freigabe`,
    recordingSubject: (n) => `${n} Clips aus Ihrer Aufnahme sind fertig`,
    hello: (c) => `Guten Tag, ${c},`,
    weekBody: "die Patientenvideos dieser Woche sind erstellt und softwaregestützt geprüft; das letzte Wort haben Sie.",
    recordingBody: "wir haben Ihre Aufnahme in kurze Clips mit Untertiteln geschnitten.",
    readyLine: (n) => `${n} bereit zur Freigabe`,
    flaggedLine: (n) => `${n} zur kurzen Durchsicht markiert, mit Begründung`,
    approval: "Nichts wird veröffentlicht, bevor Sie es freigeben.",
    button: "Videos ansehen",
    footer: "Sie erhalten diese E-Mail, weil Ihre Praxis DentVideo nutzt.",
    weekTitle: "Die Videos dieser Woche sind fertig",
    recordingTitle: "Ihre Clips sind fertig",
    approveAsk: "Schon zufrieden?",
    approveAll: "Alle fertigen Videos freigeben",
  },
  es: {
    weekSubject: (n) => `${n} vídeos nuevos esperan tu revisión`,
    recordingSubject: (n) => `${n} clips de tu grabación están listos`,
    hello: (c) => `Hola, ${c}:`,
    weekBody: "Los vídeos educativos de esta semana ya están hechos y revisados por software; la última palabra es tuya.",
    recordingBody: "Hemos convertido tu grabación en clips cortos con subtítulos.",
    readyLine: (n) => `${n} listos para aprobar`,
    flaggedLine: (n) => `${n} marcados para un vistazo rápido, con el motivo`,
    approval: "No se publica nada hasta que tú lo apruebes.",
    button: "Revisar los vídeos",
    footer: "Recibes este correo porque tu clínica usa DentVideo.",
    weekTitle: "Los vídeos de esta semana están listos",
    recordingTitle: "Tus clips están listos",
    approveAsk: "¿Ya te convencen?",
    approveAll: "Aprobar todos los vídeos listos",
  },
  fr: {
    weekSubject: (n) => `${n} nouvelles vidéos attendent votre validation`,
    recordingSubject: (n) => `${n} clips de votre enregistrement sont prêts`,
    hello: (c) => `Bonjour ${c},`,
    weekBody: "Les vidéos patients de cette semaine sont prêtes et vérifiées par logiciel ; le dernier mot vous revient.",
    recordingBody: "Nous avons transformé votre enregistrement en clips courts sous-titrés.",
    readyLine: (n) => `${n} prêtes à valider`,
    flaggedLine: (n) => `${n} à revoir rapidement, avec la raison`,
    approval: "Rien n'est publié sans votre validation.",
    button: "Voir les vidéos",
    footer: "Vous recevez cet e-mail car votre cabinet utilise DentVideo.",
    weekTitle: "Les vidéos de la semaine sont prêtes",
    recordingTitle: "Vos clips sont prêts",
    approveAsk: "Elles vous conviennent déjà ?",
    approveAll: "Valider toutes les vidéos prêtes",
  },
  it: {
    weekSubject: (n) => `${n} nuovi video attendono la Sua approvazione`,
    recordingSubject: (n) => `${n} clip dalla Sua registrazione sono pronte`,
    hello: (c) => `Buongiorno ${c},`,
    weekBody: "i video per i pazienti di questa settimana sono pronti e verificati.",
    recordingBody: "abbiamo trasformato la Sua registrazione in brevi clip sottotitolate.",
    readyLine: (n) => `${n} pronti da approvare`,
    flaggedLine: (n) => `${n} da ricontrollare, con il motivo`,
    approval: "Nulla viene pubblicato senza la Sua approvazione.",
    button: "Vedere i video",
    footer: "Riceve questa e-mail perché il Suo studio usa DentVideo.",
    weekTitle: "I video di questa settimana sono pronti",
    recordingTitle: "Le Sue clip sono pronte",
    approveAsk: "Le vanno già bene?",
    approveAll: "Approvare tutti i video pronti",
  },
  pt: {
    weekSubject: (n) => `${n} vídeos novos aguardam a tua revisão`,
    recordingSubject: (n) => `${n} clipes da tua gravação estão prontos`,
    hello: (c) => `Olá, ${c}:`,
    weekBody: "Os vídeos educativos desta semana estão feitos e verificados.",
    recordingBody: "Transformámos a tua gravação em clipes curtos com legendas.",
    readyLine: (n) => `${n} prontos para aprovar`,
    flaggedLine: (n) => `${n} assinalados para uma revisão rápida, com o motivo`,
    approval: "Nada é publicado sem a tua aprovação.",
    button: "Rever os vídeos",
    footer: "Recebes este e-mail porque a tua clínica usa a DentVideo.",
    weekTitle: "Os vídeos desta semana estão prontos",
    recordingTitle: "Os teus clipes estão prontos",
    approveAsk: "Já estão do teu agrado?",
    approveAll: "Aprovar todos os vídeos prontos",
  },
  tr: {
    weekSubject: (n) => `${n} yeni video onayınızı bekliyor`,
    recordingSubject: (n) => `Kaydınızdan ${n} klip hazır`,
    hello: (c) => `Merhaba ${c},`,
    weekBody: "Bu haftanın hasta bilgilendirme videoları hazırlandı ve yazılım destekli kontrolden geçti; son karar sizin.",
    recordingBody: "Kaydınızı altyazılı kısa kliplere dönüştürdük.",
    readyLine: (n) => `${n} video onaya hazır`,
    flaggedLine: (n) => `${n} video kısa bir kontrol bekliyor (nedenini gösteriyoruz)`,
    approval: "Siz onaylamadan hiçbir şey yayınlanmaz.",
    button: "Videoları inceleyin",
    footer: "Bu e-postayı kliniğiniz DentVideo kullandığı için alıyorsunuz.",
    weekTitle: "Bu haftanın videoları hazır",
    recordingTitle: "Klipleriniz hazır",
    approveAsk: "Hazır olanları zaten beğendiyseniz:",
    approveAll: "Hazır videoların tümünü onaylayın",
  },
  ja: {
    weekSubject: (n) => `新しい動画${n}本のご確認をお願いします`,
    recordingSubject: (n) => `撮影した動画から${n}本のクリップができました`,
    hello: (c) => `${c} ご担当者様`,
    weekBody: "今週の患者さん向け説明動画が完成し、ソフトウェアによるチェックも済みました。最終判断は先生が行います。",
    recordingBody: "撮影した動画を、字幕付きの短いクリップに仕上げました。",
    readyLine: (n) => `承認待ち：${n}本`,
    flaggedLine: (n) => `要確認：${n}本（理由を表示しています）`,
    approval: "院長先生が承認されるまで、何も公開されません。",
    button: "動画を確認する",
    footer: "このメールは、DentVideoをご利用の医院にお送りしています。",
    weekTitle: "今週の動画ができました",
    recordingTitle: "クリップができました",
    approveAsk: "内容に問題がなければ",
    approveAll: "準備済みの動画をまとめて承認する",
  },
  ar: {
    weekSubject: (n) => `فيديوهات جديدة بانتظار مراجعتكم: ${n}`,
    recordingSubject: (n) => `مقاطع جاهزة من تسجيلكم: ${n}`,
    hello: (c) => `مرحباً ${c}،`,
    weekBody: "فيديوهات هذا الأسبوع التوعوية للمرضى جاهزة وتمّت مراجعتها آلياً، والقرار الأخير لكم.",
    recordingBody: "حوّلنا تسجيلكم إلى مقاطع قصيرة مع النص على الشاشة.",
    readyLine: (n) => `جاهزة للاعتماد: ${n}`,
    flaggedLine: (n) => `تحتاج نظرة سريعة: ${n}، مع ذكر السبب`,
    approval: "لا يُنشر شيء قبل أن تعتمدوه.",
    button: "مراجعة الفيديوهات",
    footer: "تصلكم هذه الرسالة لأن عيادتكم تستخدم DentVideo.",
    weekTitle: "فيديوهات هذا الأسبوع جاهزة",
    recordingTitle: "مقاطعكم جاهزة",
    approveAsk: "راضون عنها بالفعل؟",
    approveAll: "اعتماد كل الفيديوهات الجاهزة",
  },
  pl: {
    weekSubject: (n) => `Nowe filmy czekają na Państwa akceptację: ${n}`,
    recordingSubject: (n) => `Klipy z Państwa nagrania są gotowe: ${n}`,
    hello: (c) => `Dzień dobry, ${c},`,
    weekBody: "filmy edukacyjne na ten tydzień są gotowe i sprawdzone przez oprogramowanie; ostatnie słowo należy do Państwa.",
    recordingBody: "Państwa nagranie zamieniliśmy w krótkie klipy z napisami.",
    readyLine: (n) => `Gotowe do akceptacji: ${n}`,
    flaggedLine: (n) => `Do szybkiego przejrzenia: ${n}, z podaniem powodu`,
    approval: "Nic nie zostanie opublikowane bez Państwa akceptacji.",
    button: "Przejrzyj filmy",
    footer: "Otrzymują Państwo tę wiadomość, ponieważ gabinet korzysta z DentVideo.",
    weekTitle: "Filmy na ten tydzień są gotowe",
    recordingTitle: "Państwa klipy są gotowe",
    approveAsk: "Wszystko się zgadza?",
    approveAll: "Zaakceptuj wszystkie gotowe filmy",
  },
};

export const EMAIL_LANGUAGES = Object.keys(COPY);

/** Which of a clinic's own settings the first-week email may suggest (only ones not set yet). */
export type SettingsNudge = "handle" | "closingLine" | "both";

/** "Monday 23 November" in the email's language, from a YYYY-MM-DD Monday (read at noon UTC so it never shifts a day). */
export function deliveryDate(week: string, lang: string): string | null {
  const d = new Date(`${week}T12:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(week) || Number.isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat(dateLocale(lang), { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(d);
}

export function readyEmail(args: {
  kind: ReadyKind;
  counts: ReadyCounts;
  clinicName: string;
  language: string;
  appUrl: string;
  /** Posters of this week's videos (generated videos only — never a recording, which may show people). */
  thumbs?: Thumb[];
  /** The signed one-tap approve page (approve-link.ts); only when something is ready to approve. */
  approveUrl?: string | null;
  /**
   * The week's videos, each with its poster, caption preview, suggested
   * posting time and its own "Approve & share" link (post-link.ts). Shown in
   * place of the poster grid when given.
   */
  videos?: VideoRow[];
  brand?: Brand;
  /**
   * The clinic's first delivered week (ready-notice.ts decides): a welcome,
   * three steps from "ready" to "posted" with the app's real button labels,
   * the next delivery date and, when `nudge` says so, one optional line
   * about Settings. Weeks only.
   */
  first?: boolean;
  /** The Monday of the next delivery (YYYY-MM-DD), for the first-week email. */
  nextDate?: string | null;
  /** First week only: settings the clinic has not filled in yet that the email may mention. */
  nudge?: SettingsNudge | null;
  /**
   * How many of the week's five were left out (they did not pass the checks).
   * Weeks only; 0 or absent says nothing. Never a promise of a remake or a credit.
   */
  missing?: number;
}): Rendered | null {
  const total = args.counts.ready + args.counts.flagged;
  if (total === 0) return null;
  const week = args.kind === "week";
  const missing = week && Number.isInteger(args.missing) && args.missing! > 0 && args.missing! < WEEK_VIDEOS ? args.missing! : 0;
  const first = week && args.first === true;
  // The first-week and short-week words exist in the site's eight languages. An Italian or
  // Portuguese clinic (English app, English welcome) gets that email in English, whole, so
  // it never mixes two languages.
  const notices = first || missing > 0;
  const lang = notices && !hasDeliveryNotices(args.language) ? "en" : Object.hasOwn(COPY, args.language) ? args.language : "en";
  const c = COPY[lang];
  const n = notices ? deliveryNoticesText(lang).copy : null;
  const subject = first && n ? n.first.subject : week ? c.weekSubject(total) : c.recordingSubject(total);
  const body = first && n ? n.first.welcome : week ? c.weekBody : c.recordingBody;
  const lines = [args.counts.ready > 0 ? c.readyLine(args.counts.ready) : "", args.counts.flagged > 0 ? c.flaggedLine(args.counts.flagged) : ""].filter(Boolean);
  const videos = week ? (args.videos ?? []).filter((v) => /^https?:\/\//.test(v.href)).slice(0, 6) : [];
  const thumbs = week && !videos.length ? (args.thumbs ?? []).filter((t) => /^https:\/\//.test(t.url)).slice(0, 4) : [];
  const name = args.clinicName.replace(/\s+/g, " ").trim().slice(0, 80);
  const approveAll = !!args.approveUrl && args.counts.ready > 0;
  const next = first && n && args.nextDate ? deliveryDate(args.nextDate, lang) : null;
  return renderEmail({
    lang,
    subject,
    // The inbox line says what is waiting, not the first sentence again.
    preheader: `${lines.join(" · ")}. ${c.approval}`,
    title: first && n ? n.first.title : week ? c.weekTitle : c.recordingTitle,
    hello: c.hello(name).replace(/\s+([,،:])/g, "$1"),
    blocks: [
      { kind: "p", text: body },
      // What is waiting comes first; each video then has its own one-tap action.
      { kind: "list", items: lines },
      // A short week says so, once, plainly: how many were left out and why.
      ...(missing && n ? [{ kind: "p" as const, text: countText(n.short, missing, lang) }] : []),
      ...(first && n ? firstWeekSteps(n, lang, { approveAll, ready: args.counts.ready }) : []),
      ...(videos.length ? [{ kind: "videos" as const, heading: postingText(lang).email.heading, items: videos }] : []),
      ...(thumbs.length ? [{ kind: "thumbs" as const, items: thumbs }] : []),
      ...(next && n ? [{ kind: "p" as const, text: fmt(n.first.next, { date: next }) }] : []),
      ...(first && n && args.nudge ? [{ kind: "panel" as const, text: fmt(n.first.nudge[args.nudge], { settings: appText(lang as Locale).chrome.settings }) }] : []),
    ],
    button: { label: c.button, url: args.appUrl },
    // "Approve all" opens the signed approve page (one confirming tap there; never a flagged video).
    secondary: approveAll ? { ask: c.approveAsk, label: c.approveAll, url: args.approveUrl!, style: "button" } : undefined,
    afterButton: [c.approval],
    // How approving works, or what "marked for a look" means when that is all that is waiting.
    helpLink: helpCenterLink(lang, args.counts.ready > 0 ? "approve" : "needs-a-look"),
    // Signed like every other DentVideo email ("The DentVideo team", in the clinic's language).
    signoff: lifecycleText(lang).copy.signoff,
    footer: c.footer,
    brand: { ...args.brand, name },
  });
}

/**
 * The first week's three steps, with the real labels of the buttons they
 * name: this email's approve-all button and the app's "Save video + copy
 * caption" on an approved video (read from their content files, so a
 * renamed button is renamed here too).
 */
function firstWeekSteps(n: DeliveryNotices, lang: string, a: { approveAll: boolean; ready: number }): Block[] {
  const f = n.first;
  const loc = lang as Locale;
  const one = a.approveAll ? f.approveHere : a.ready > 0 ? f.approveInApp : f.lookFirst;
  const vars = { approve: COPY[lang].approveAll, post: postingText(loc).saveAndCopy };
  return [
    { kind: "p", text: f.stepsIntro },
    { kind: "steps", items: [one, f.post, f.paste].map((s) => ({ title: s.title, body: fmt(s.body, vars) })) },
  ];
}

/* ------------------------------------------------------------ running late */

/** late: a paying clinic's week missed its Monday morning; first-late: a first week is still not there 2 h after payment. */
export type DelayKind = "late" | "first-late";

/**
 * "This week's videos are running late": sent once per clinic and week when
 * a watchdog finds a week late (worker/src/dentvid/delivery.ts, watchdog.ts,
 * through api/internal/dentvideo/notify and delay-notice.ts). Calm and
 * short: queued, nothing extra charged, we email when they are ready,
 * nothing to do. No button: there is nothing to do.
 */
export function delayEmail(args: { kind: DelayKind; clinicName: string; language: string; brand?: Brand }): Rendered {
  const { lang, copy } = deliveryNoticesText(args.language);
  const c = COPY[lang];
  const t = args.kind === "late" ? copy.late : copy.firstLate;
  const name = args.clinicName.replace(/\s+/g, " ").trim().slice(0, 80);
  return renderEmail({
    lang,
    subject: t.subject,
    preheader: t.preheader,
    title: t.title,
    hello: c.hello(name).replace(/\s+([,،:])/g, "$1"),
    blocks: [
      { kind: "p", text: t.body },
      { kind: "p", text: t.next },
    ],
    signoff: lifecycleText(lang).copy.signoff,
    footer: c.footer,
    brand: { ...args.brand, name },
  });
}

export type SendOptions = {
  /** Extra MIME headers, e.g. List-Unsubscribe / List-Unsubscribe-Post. */
  headers?: Record<string, string>;
  /** Resend keeps one send per key for 24 hours: a retried call cannot mail twice. */
  idempotencyKey?: string;
  /**
   * What to record in dentvid_email_sends (0010) for the admin panel: kind,
   * clinic, language — never the address or content. Without it, a send whose
   * idempotency key names a clinic ("dentvideo-<kind>-<clinic id>[-<day>]") is
   * recorded from the key; anything else (password reset, sign-in code) is not.
   */
  log?: EmailLog | null;
};

export type EmailLog = { clinicId: string | null; kind: string; language?: string | null };

/** The log entry an idempotency key implies ("dentvideo-welcome-<uuid>", "dentvideo-payment-on_hold-<uuid>-2026-11-11"). */
export function emailLogFromKey(key: string | undefined): EmailLog | null {
  const m = /^dentvideo-([a-z_-]{3,40})-([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})(?:-\d{4}-\d{2}-\d{2})?$/.exec(key ?? "");
  if (!m) return null;
  return { clinicId: m[2], kind: m[1].replace(/-/g, "_") };
}

/** Best effort: one row in dentvid_email_sends. A missing table (0010 not applied) is ignored. */
async function logSend(entry: EmailLog | null, ok: boolean, error: string | null): Promise<void> {
  if (!entry) return;
  try {
    const { dvAdmin } = await import("./supabase");
    await dvAdmin()
      .from("dentvid_email_sends")
      .insert({
        clinic_id: entry.clinicId,
        kind: entry.kind.slice(0, 40),
        language: entry.language && /^[a-z]{2}$/.test(entry.language) ? entry.language : null,
        status: ok ? "sent" : "failed",
        error: error ? error.slice(0, 500) : null,
      });
  } catch {
    // best effort
  }
}

/**
 * Test and QA addresses (qa+…, e2e…, dvq…+…, e2e-monitor+…) don't exist as
 * mailboxes: real sends to them bounce and hurt dentvideo.com's sender
 * reputation. They go to Resend's test sink instead, which always "delivers"
 * without a real mailbox. DENTVID_TEST_EMAIL_PATTERNS adds patterns
 * (comma-separated, same syntax as the internal-traffic patterns).
 */
export const TEST_EMAIL_PATTERNS: readonly string[] = ["qa+*@*", "e2e*@*", "dvq*+*@*", "e2e-monitor+*@*"];
export const TEST_EMAIL_SINK = "delivered@resend.dev";
export function deliveryAddress(to: string, env: Record<string, string | undefined> = process.env): string {
  const extra = (env.DENTVID_TEST_EMAIL_PATTERNS ?? "").split(",").map((p) => p.trim()).filter(Boolean);
  return isInternalEmail(to, [...TEST_EMAIL_PATTERNS, ...extra]) ? TEST_EMAIL_SINK : to;
}

/** Sends through Resend. Returns false (never throws) when it cannot. */
export async function sendEmail(to: string, msg: { subject: string; html: string; text: string }, opts: SendOptions = {}): Promise<boolean> {
  const entry = opts.log === undefined ? emailLogFromKey(opts.idempotencyKey) : opts.log;
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    // Every clinic email is failing: say so in the logs and count it like any other failure.
    console.error("dentvideo email not sent: RESEND_API_KEY is not set");
    await noteOps("RESEND_API_KEY is not set");
    await logSend(entry, false, "RESEND_API_KEY is not set");
    return false;
  }
  const from = process.env.DENTVIDEO_EMAIL_FROM || "DentVideo <hello@dentvideo.com>";
  const replyTo = process.env.DENTVIDEO_EMAIL_REPLY_TO || "hello@dentvideo.com";
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        authorization: `Bearer ${key}`,
        "content-type": "application/json",
        ...(opts.idempotencyKey ? { "idempotency-key": opts.idempotencyKey } : {}),
      },
      body: JSON.stringify({
        from,
        to: [deliveryAddress(to)],
        reply_to: replyTo,
        // One header line whatever the template put in it (security round 3).
        subject: msg.subject.replace(/\s+/g, " ").trim(),
        html: msg.html,
        text: msg.text,
        ...(opts.headers ? { headers: opts.headers } : {}),
      }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) {
      const detail = (await res.text()).slice(0, 300);
      console.error("dentvideo email failed", res.status, detail);
      await noteOps(`${res.status} ${detail}`);
      await logSend(entry, false, `${res.status} ${detail}`);
    } else {
      await noteOps(null);
      await logSend(entry, true, null);
    }
    return res.ok;
  } catch (e) {
    console.error("dentvideo email failed", (e as Error).message);
    await noteOps((e as Error).message);
    await logSend(entry, false, (e as Error).message);
    return false;
  }
}

/** Sent / failed counts for the owner's digest and the email-failure alert (ops-server.ts). Never throws. */
async function noteOps(error: string | null): Promise<void> {
  try {
    const ops = await import("./ops-server");
    await (error === null ? ops.noteEmailSent() : ops.noteEmailFailure(error));
  } catch {
    // best effort
  }
}
