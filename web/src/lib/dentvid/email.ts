/**
 * The one email DentVideo sends: "your videos are ready for your review".
 *
 * Plain, short and in the clinic's language. It says how many videos are
 * ready and how many need a look, and links straight to the library. It
 * never contains the videos themselves or anything a patient could be
 * identified from — the library is behind the clinic's login.
 */

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
  },
};

export const EMAIL_LANGUAGES = Object.keys(COPY);

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export function readyEmail(args: {
  kind: ReadyKind;
  counts: ReadyCounts;
  clinicName: string;
  language: string;
  appUrl: string;
}): { subject: string; html: string; text: string } | null {
  const total = args.counts.ready + args.counts.flagged;
  if (total === 0) return null;
  const c = COPY[args.language] ?? COPY.en;
  const subject = args.kind === "week" ? c.weekSubject(total) : c.recordingSubject(total);
  const lines = [
    args.counts.ready > 0 ? c.readyLine(args.counts.ready) : "",
    args.counts.flagged > 0 ? c.flaggedLine(args.counts.flagged) : "",
  ].filter(Boolean);
  const body = args.kind === "week" ? c.weekBody : c.recordingBody;
  const text = [c.hello(args.clinicName), "", body, "", ...lines.map((l) => `• ${l}`), "", c.approval, "", `${c.button}: ${args.appUrl}`, "", "—", c.footer].join("\n");
  const html = `<!doctype html><html><body style="margin:0;background:#faf7f2;font-family:Inter,Helvetica,Arial,sans-serif;color:#14211f">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" style="max-width:520px;background:#ffffff;border:1px solid #e8e1d5;border-radius:16px" cellpadding="0" cellspacing="0"><tr><td style="padding:32px">
<p style="margin:0 0 24px;font-weight:600;color:#0f5c5c;font-size:18px">DentVideo</p>
<p style="margin:0 0 12px;font-size:16px">${esc(c.hello(args.clinicName))}</p>
<p style="margin:0 0 16px;font-size:16px;line-height:1.5">${esc(body)}</p>
<ul style="margin:0 0 16px;padding-left:20px;font-size:16px;line-height:1.6">${lines.map((l) => `<li>${esc(l)}</li>`).join("")}</ul>
<p style="margin:0 0 24px;font-size:14px;color:#4a5a57">${esc(c.approval)}</p>
<a href="${esc(args.appUrl)}" style="display:inline-block;background:#0f5c5c;color:#f5efe6;text-decoration:none;padding:14px 28px;border-radius:999px;font-weight:600">${esc(c.button)}</a>
</td></tr></table>
<p style="margin:16px 0 0;font-size:12px;color:#6b7a77">${esc(c.footer)}</p>
</td></tr></table></body></html>`;
  return { subject, html, text };
}

/** Sends through Resend. Returns false (never throws) when it cannot. */
export async function sendEmail(to: string, msg: { subject: string; html: string; text: string }): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return false;
  const from = process.env.DENTVIDEO_EMAIL_FROM || "DentVideo <hello@dentvideo.com>";
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify({ from, to: [to], subject: msg.subject, html: msg.html, text: msg.text }),
    });
    if (!res.ok) console.error("dentvideo email failed", res.status, (await res.text()).slice(0, 300));
    return res.ok;
  } catch (e) {
    console.error("dentvideo email failed", (e as Error).message);
    return false;
  }
}
