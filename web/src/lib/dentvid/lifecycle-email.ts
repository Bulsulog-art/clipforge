import { fill, lifecycleText, type LifecycleCopy } from "@/content/dentvideo-lifecycle";

/**
 * Lifecycle emails, rendered: the welcome after the first payment, the two
 * reminders for a clinic that has not paid, and the unsubscribe page.
 *
 * Same look and the same email-client rules as the "videos ready" email
 * (email.ts): table layout, inline styles, a bgcolor button, one column of
 * at most 520 px. Arabic flips the whole message (dir="rtl"); the brand,
 * links and the email address stay left to right.
 *
 * Pure: no I/O, no environment. Prices and the founding offer come in as
 * arguments (lifecycle.ts reads them from billing.ts).
 */

export type Rendered = { subject: string; html: string; text: string };

export const CONTACT_EMAIL = "hello@dentvideo.com";

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,'Hiragino Sans','Yu Gothic',sans-serif";
const INK = "#14211f";
const TEAL = "#0f5c5c";
const MUTED = "#5b6a67";
const PAPER = "#faf7f2";

/** "$49" in the reader's language — the same format the plan screen uses (Arabic keeps "$49"). */
export function usd(lang: string, amount: number): string {
  return new Intl.NumberFormat(lang === "ar" ? "en-US" : lang, { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(amount);
}

/** A clinic name fit for a subject line and a greeting. */
function clinicLabel(name: string | null | undefined): string {
  return (name ?? "").replace(/[\r\n\t]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);
}

/** A line whose {clinic} came out empty, without the orphaned space or comma ("Hello ," → "Hello,"). */
function tidy(s: string): string {
  return s
    .replace(/^\s*様、/, "")
    .replace(/\s+([,،:!])/g, "$1")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/** Escaped text with the contact address turned into a mailto link (kept left to right). */
function richText(s: string): string {
  const e = esc(s);
  const addr = esc(CONTACT_EMAIL);
  return e.split(addr).join(`<a href="mailto:${addr}" dir="ltr" style="color:${TEAL};text-decoration:underline">${addr}</a>`);
}

type Layout = {
  lang: string;
  subject: string;
  preheader: string;
  hello: string;
  body: string; // inner HTML of the card, after the greeting
  button: { label: string; url: string };
  afterButton?: string; // small note under the link
  signoff: string;
  footer: string;
  unsubscribe?: { ask: string; label: string; url: string };
};

function layout(l: Layout): string {
  const rtl = l.lang === "ar";
  const dir = rtl ? "rtl" : "ltr";
  const align = rtl ? "right" : "left";
  const url = esc(l.button.url);
  const unsub = l.unsubscribe
    ? `<br>${esc(l.unsubscribe.ask)} <a href="${esc(l.unsubscribe.url)}" style="color:${MUTED};text-decoration:underline">${esc(l.unsubscribe.label)}</a>`
    : "";
  return `<!doctype html>
<html lang="${l.lang}" dir="${dir}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light"><title>${esc(l.subject)}</title></head>
<body dir="${dir}" style="margin:0;padding:0;background:${PAPER};font-family:${FONT};color:${INK};-webkit-text-size-adjust:100%;text-align:${align}">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:${PAPER}">${esc(l.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${PAPER}"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" dir="${dir}" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;text-align:${align}">
<tr><td style="padding:0 4px 16px;font-family:${FONT};font-size:20px;font-weight:700;letter-spacing:-0.2px;color:${INK};text-align:${align}"><span dir="ltr">Dent<span style="color:${TEAL}">Video</span></span></td></tr>
<tr><td style="background:#ffffff;border:1px solid #e8e1d5;border-radius:16px;padding:32px 28px;font-family:${FONT};text-align:${align}">
<p style="margin:0 0 16px;font-size:16px;line-height:24px">${esc(l.hello)}</p>
${l.body}
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 0"><tr><td bgcolor="${TEAL}" style="border-radius:999px;background:${TEAL}"><a href="${url}" style="display:inline-block;padding:14px 28px;font-family:${FONT};font-size:16px;font-weight:600;line-height:20px;color:#ffffff;text-decoration:none;border-radius:999px">${esc(l.button.label)}</a></td></tr></table>
<p style="margin:16px 0 0;font-size:12px;line-height:18px;color:${MUTED};word-break:break-all"><a href="${url}" dir="ltr" style="color:${TEAL}">${url}</a></p>
${l.afterButton ?? ""}
<p style="margin:24px 0 0;font-size:16px;line-height:24px">${esc(l.signoff)}</p>
</td></tr>
<tr><td style="padding:16px 4px 0;font-size:12px;line-height:18px;color:${MUTED};text-align:${align}">${esc(l.footer)}${unsub}</td></tr>
</table>
</td></tr></table></body></html>`;
}

const para = (s: string) => `<p style="margin:0 0 16px;font-size:16px;line-height:24px">${richText(s)}</p>`;

/** "Why us" as a quiet panel with a check, so the reason to trust stands apart from the pitch. */
const panel = (s: string, rtl: boolean) =>
  `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 16px;background:${PAPER};border-radius:12px"><tr>` +
  `<td width="28" valign="top" style="padding:14px 0 14px ${rtl ? "0" : "16px"};${rtl ? "padding-right:16px;" : ""}font-size:16px;line-height:24px;color:${TEAL};font-weight:700">&#10003;</td>` +
  `<td style="padding:${rtl ? "14px 4px 14px 16px" : "14px 16px 14px 4px"};font-size:15px;line-height:23px;color:${INK}">${richText(s)}</td></tr></table>`;

function textVersion(parts: (string | false | undefined)[]): string {
  return parts.filter((p): p is string => typeof p === "string").join("\n\n");
}

/** Welcome, right after the first payment: what happens next, how to approve and share, how to reach us. Transactional. */
export function welcomeEmail(args: { language: string; clinicName: string; appUrl: string }): Rendered {
  const { lang, copy: c } = lifecycleText(args.language);
  const clinic = clinicLabel(args.clinicName);
  const vars = { clinic, email: CONTACT_EMAIL };
  const subject = tidy(fill(c.welcome.subject, vars)).replace(/[,،]$/, "");
  const steps = c.welcome.steps.map((s, i) => ({ n: i + 1, title: fill(s.title, vars), body: fill(s.body, vars) }));
  const rows = steps
    .map(
      (s) =>
        `<tr><td width="40" valign="top" style="padding:0 0 18px"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td width="28" height="28" align="center" valign="middle" bgcolor="${TEAL}" style="width:28px;height:28px;border-radius:14px;background:${TEAL};color:#ffffff;font-size:14px;font-weight:700;line-height:28px;text-align:center">${s.n}</td></tr></table></td>` +
        `<td valign="top" style="padding:2px 0 18px"><p style="margin:0 0 2px;font-size:16px;line-height:24px;font-weight:600">${esc(s.title)}</p><p style="margin:0;font-size:15px;line-height:23px;color:#3d4c49">${richText(s.body)}</p></td></tr>`,
    )
    .join("");
  const body = para(fill(c.welcome.intro, vars)) + `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 8px">${rows}</table>`;
  const hello = tidy(fill(c.hello, vars));
  const html = layout({
    lang,
    subject,
    preheader: c.welcome.preheader,
    hello,
    body,
    button: { label: c.welcome.button, url: args.appUrl },
    signoff: c.signoff,
    footer: c.welcome.footer,
  });
  const text = textVersion([
    hello,
    fill(c.welcome.intro, vars),
    steps.map((s) => `${s.n}. ${s.title}\n   ${s.body}`).join("\n\n"),
    `${c.welcome.button}: ${args.appUrl}`,
    c.signoff,
    `—\n${c.welcome.footer}`,
  ]);
  return { subject, html, text };
}

type NudgeArgs = { language: string; clinicName: string; url: string; unsubscribeUrl: string };

function nudge(
  c: LifecycleCopy,
  lang: string,
  args: NudgeArgs,
  parts: { subject: string; preheader: string; problem: string; outcome: string; whyUs: string; whyNow: string; button: string; last?: string },
): Rendered {
  const rtl = lang === "ar";
  const clinic = clinicLabel(args.clinicName);
  const hello = tidy(fill(c.hello, { clinic }));
  const body = para(parts.problem) + para(parts.outcome) + panel(parts.whyUs, rtl) + para(parts.whyNow);
  const afterButton = parts.last ? `<p style="margin:16px 0 0;font-size:14px;line-height:21px;color:${MUTED}">${esc(parts.last)}</p>` : "";
  const html = layout({
    lang,
    subject: parts.subject,
    preheader: parts.preheader,
    hello,
    body,
    button: { label: parts.button, url: args.url },
    afterButton: afterButton + `<p style="margin:16px 0 0;font-size:14px;line-height:21px;color:${MUTED}">${esc(c.contact)}</p>`,
    signoff: c.signoff,
    footer: c.nudgeFooter,
    unsubscribe: { ask: c.unsubscribeAsk, label: c.unsubscribe, url: args.unsubscribeUrl },
  });
  const text = textVersion([
    hello,
    parts.problem,
    parts.outcome,
    `✓ ${parts.whyUs}`,
    parts.whyNow,
    `${parts.button}: ${args.url}`,
    parts.last,
    c.contact,
    c.signoff,
    `—\n${c.nudgeFooter}\n${c.unsubscribeAsk} ${c.unsubscribe}: ${args.unsubscribeUrl}`,
  ]);
  return { subject: parts.subject, html, text };
}

/** Reminder 1 (~24 h after the clinic step): the branded preview is waiting. */
export function previewNudgeEmail(args: NudgeArgs): Rendered {
  const { lang, copy: c } = lifecycleText(args.language);
  return nudge(c, lang, args, { ...c.preview });
}

export type OfferTerms =
  | { open: true; priceUsd: number; thenUsd: number; months: number; clinics: number; code: string }
  | { open: false; fromUsd: number };

/** Reminder 2 (~72 h), the last one: the founding offer while it is open, else the plain starting price. */
export function offerNudgeEmail(args: NudgeArgs & { offer: OfferTerms }): Rendered {
  const { lang, copy: c } = lifecycleText(args.language);
  const o = args.offer;
  const vars: Record<string, string | number> = o.open
    ? { price: usd(lang, o.priceUsd), then: usd(lang, o.thenUsd), months: o.months, clinics: o.clinics, code: o.code }
    : { from: usd(lang, o.fromUsd) };
  return nudge(c, lang, args, {
    subject: fill(o.open ? c.offer.subjectOpen : c.offer.subjectClosed, vars),
    preheader: fill(o.open ? c.offer.preheaderOpen : c.offer.preheaderClosed, vars),
    problem: c.offer.problem,
    outcome: c.offer.outcome,
    whyUs: c.offer.whyUs,
    whyNow: fill(o.open ? c.offer.whyNowOpen : c.offer.whyNowClosed, vars),
    button: c.offer.button,
    last: c.offer.last,
  });
}

/** The page the unsubscribe link opens: a short confirmation in the clinic's language. */
export function unsubscribePage(args: { language: string; state: "done" | "invalid" | "error"; homeUrl: string }): string {
  const { lang, copy: c } = lifecycleText(args.language);
  const p = c.unsubPage;
  const [title, body] =
    args.state === "done" ? [p.title, p.body] : args.state === "invalid" ? [p.invalidTitle, p.invalidBody] : [p.errorTitle, p.errorBody];
  const rtl = lang === "ar";
  return `<!doctype html>
<html lang="${lang}" dir="${rtl ? "rtl" : "ltr"}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${esc(title)} · DentVideo</title></head>
<body style="margin:0;background:${PAPER};font-family:${FONT};color:${INK}">
<main style="max-width:520px;margin:0 auto;padding:48px 16px">
<p style="margin:0 0 16px;font-size:20px;font-weight:700"><span dir="ltr">Dent<span style="color:${TEAL}">Video</span></span></p>
<div style="background:#fff;border:1px solid #e8e1d5;border-radius:16px;padding:28px">
<h1 style="margin:0 0 12px;font-size:22px;line-height:30px">${esc(title)}</h1>
<p style="margin:0 0 20px;font-size:16px;line-height:24px">${richText(fill(body, { email: CONTACT_EMAIL }))}</p>
<a href="${esc(args.homeUrl)}" style="display:inline-block;padding:12px 24px;border-radius:999px;background:${TEAL};color:#fff;text-decoration:none;font-weight:600">${esc(p.back)}</a>
</div></main></body></html>`;
}
