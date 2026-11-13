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

import { renderEmail, type Brand, type Rendered, type Thumb, type VideoRow } from "./email-layout";
import { postingText } from "@/content/dentvideo-posting";
import { lifecycleText } from "@/content/dentvideo-lifecycle";

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
    weekBody: "This week's patient-education videos are made and checked.",
    recordingBody: "We turned your recording into short captioned clips.",
    readyLine: (n) => `${n} ready to approve`,
    flaggedLine: (n) => `${n} marked for a quick look, with the reason`,
    approval: "Nothing is published until you approve it.",
    button: "Review the videos",
    footer: "You get this email because your clinic uses DentVideo.",
    weekTitle: "This week's videos are ready",
    recordingTitle: "Your clips are ready",
    approveAsk: "Already happy with them?",
    approveAll: "Approve all ready videos in one tap",
  },
  de: {
    weekSubject: (n) => `${n} neue Videos warten auf Ihre Freigabe`,
    recordingSubject: (n) => `${n} Clips aus Ihrer Aufnahme sind fertig`,
    hello: (c) => `Guten Tag, ${c},`,
    weekBody: "die Patientenvideos dieser Woche sind erstellt und geprüft.",
    recordingBody: "wir haben Ihre Aufnahme in kurze Clips mit Untertiteln geschnitten.",
    readyLine: (n) => `${n} bereit zur Freigabe`,
    flaggedLine: (n) => `${n} zur kurzen Durchsicht markiert, mit Begründung`,
    approval: "Nichts wird veröffentlicht, bevor Sie es freigeben.",
    button: "Videos ansehen",
    footer: "Sie erhalten diese E-Mail, weil Ihre Praxis DentVideo nutzt.",
    weekTitle: "Die Videos dieser Woche sind fertig",
    recordingTitle: "Ihre Clips sind fertig",
    approveAsk: "Schon zufrieden?",
    approveAll: "Alle fertigen Videos mit einem Klick freigeben",
  },
  es: {
    weekSubject: (n) => `${n} vídeos nuevos esperan tu revisión`,
    recordingSubject: (n) => `${n} clips de tu grabación están listos`,
    hello: (c) => `Hola, ${c}:`,
    weekBody: "Los vídeos educativos de esta semana ya están hechos y revisados.",
    recordingBody: "Hemos convertido tu grabación en clips cortos con subtítulos.",
    readyLine: (n) => `${n} listos para aprobar`,
    flaggedLine: (n) => `${n} marcados para un vistazo rápido, con el motivo`,
    approval: "No se publica nada hasta que tú lo apruebes.",
    button: "Revisar los vídeos",
    footer: "Recibes este correo porque tu clínica usa DentVideo.",
    weekTitle: "Los vídeos de esta semana están listos",
    recordingTitle: "Tus clips están listos",
    approveAsk: "¿Ya te convencen?",
    approveAll: "Aprobar todos los vídeos listos con un toque",
  },
  fr: {
    weekSubject: (n) => `${n} nouvelles vidéos attendent votre validation`,
    recordingSubject: (n) => `${n} clips de votre enregistrement sont prêts`,
    hello: (c) => `Bonjour ${c},`,
    weekBody: "Les vidéos patients de cette semaine sont prêtes et vérifiées.",
    recordingBody: "Nous avons transformé votre enregistrement en clips courts sous-titrés.",
    readyLine: (n) => `${n} prêtes à valider`,
    flaggedLine: (n) => `${n} à revoir rapidement, avec la raison`,
    approval: "Rien n'est publié sans votre validation.",
    button: "Voir les vidéos",
    footer: "Vous recevez cet e-mail car votre cabinet utilise DentVideo.",
    weekTitle: "Les vidéos de la semaine sont prêtes",
    recordingTitle: "Vos clips sont prêts",
    approveAsk: "Elles vous conviennent déjà ?",
    approveAll: "Valider toutes les vidéos prêtes en un clic",
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
    approveAll: "Approvare tutti i video pronti con un tocco",
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
    approveAll: "Aprovar todos os vídeos prontos com um toque",
  },
  tr: {
    weekSubject: (n) => `${n} yeni video onayınızı bekliyor`,
    recordingSubject: (n) => `Kaydınızdan ${n} klip hazır`,
    hello: (c) => `Merhaba ${c},`,
    weekBody: "Bu haftanın hasta bilgilendirme videoları hazırlandı ve kontrol edildi.",
    recordingBody: "Kaydınızı altyazılı kısa kliplere dönüştürdük.",
    readyLine: (n) => `${n} video onaya hazır`,
    flaggedLine: (n) => `${n} video kısa bir göz atma için işaretlendi (nedeniyle birlikte)`,
    approval: "Siz onaylamadan hiçbir şey yayınlanmaz.",
    button: "Videoları inceleyin",
    footer: "Bu e-postayı kliniğiniz DentVideo kullandığı için alıyorsunuz.",
    weekTitle: "Bu haftanın videoları hazır",
    recordingTitle: "Klipleriniz hazır",
    approveAsk: "Hepsini beğendiyseniz:",
    approveAll: "Hazır videoların tümünü tek dokunuşla onaylayın",
  },
  ja: {
    weekSubject: (n) => `新しい動画${n}本のご確認をお願いします`,
    recordingSubject: (n) => `撮影した動画から${n}本のクリップができました`,
    hello: (c) => `${c} ご担当者様`,
    weekBody: "今週の患者さん向け説明動画が完成し、チェックも済みました。",
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
    weekBody: "فيديوهات هذا الأسبوع التوعوية للمرضى جاهزة وتمّت مراجعتها.",
    recordingBody: "حوّلنا تسجيلكم إلى مقاطع قصيرة مع النص على الشاشة.",
    readyLine: (n) => `جاهزة للاعتماد: ${n}`,
    flaggedLine: (n) => `تحتاج نظرة سريعة: ${n}، مع ذكر السبب`,
    approval: "لا يُنشر شيء قبل أن تعتمدوه.",
    button: "مراجعة الفيديوهات",
    footer: "تصلكم هذه الرسالة لأن عيادتكم تستخدم DentVideo.",
    weekTitle: "فيديوهات هذا الأسبوع جاهزة",
    recordingTitle: "مقاطعكم جاهزة",
    approveAsk: "راضون عنها بالفعل؟",
    approveAll: "اعتماد كل الفيديوهات الجاهزة بنقرة واحدة",
  },
  pl: {
    weekSubject: (n) => `Nowe filmy czekają na Państwa akceptację: ${n}`,
    recordingSubject: (n) => `Klipy z Państwa nagrania są gotowe: ${n}`,
    hello: (c) => `Dzień dobry, ${c},`,
    weekBody: "filmy edukacyjne na ten tydzień są gotowe i sprawdzone.",
    recordingBody: "Państwa nagranie zamieniliśmy w krótkie klipy z napisami.",
    readyLine: (n) => `Gotowe do akceptacji: ${n}`,
    flaggedLine: (n) => `Do szybkiego przejrzenia: ${n}, z podaniem powodu`,
    approval: "Nic nie zostanie opublikowane bez Państwa akceptacji.",
    button: "Przejrzyj filmy",
    footer: "Otrzymują Państwo tę wiadomość, ponieważ gabinet korzysta z DentVideo.",
    weekTitle: "Filmy na ten tydzień są gotowe",
    recordingTitle: "Państwa klipy są gotowe",
    approveAsk: "Wszystko się zgadza?",
    approveAll: "Zaakceptuj wszystkie gotowe filmy jednym kliknięciem",
  },
};

export const EMAIL_LANGUAGES = Object.keys(COPY);

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
}): Rendered | null {
  const total = args.counts.ready + args.counts.flagged;
  if (total === 0) return null;
  const lang = Object.hasOwn(COPY, args.language) ? args.language : "en";
  const c = COPY[lang];
  const week = args.kind === "week";
  const subject = week ? c.weekSubject(total) : c.recordingSubject(total);
  const body = week ? c.weekBody : c.recordingBody;
  const lines = [args.counts.ready > 0 ? c.readyLine(args.counts.ready) : "", args.counts.flagged > 0 ? c.flaggedLine(args.counts.flagged) : ""].filter(Boolean);
  const videos = week ? (args.videos ?? []).filter((v) => /^https?:\/\//.test(v.href)).slice(0, 6) : [];
  const thumbs = week && !videos.length ? (args.thumbs ?? []).filter((t) => /^https:\/\//.test(t.url)).slice(0, 4) : [];
  const name = args.clinicName.replace(/\s+/g, " ").trim().slice(0, 80);
  return renderEmail({
    lang,
    subject,
    preheader: `${body} ${c.approval}`,
    title: week ? c.weekTitle : c.recordingTitle,
    hello: c.hello(name).replace(/\s+([,،:])/g, "$1"),
    blocks: [
      { kind: "p", text: body },
      ...(videos.length ? [{ kind: "videos" as const, heading: postingText(lang).email.heading, items: videos }] : []),
      ...(thumbs.length ? [{ kind: "thumbs" as const, items: thumbs }] : []),
      { kind: "list", items: lines },
    ],
    button: { label: c.button, url: args.appUrl },
    secondary: args.approveUrl && args.counts.ready > 0 ? { ask: c.approveAsk, label: c.approveAll, url: args.approveUrl } : undefined,
    afterButton: [c.approval],
    // Signed like every other DentVideo email ("The DentVideo team", in the clinic's language).
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
        to: [to],
        reply_to: replyTo,
        subject: msg.subject,
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
