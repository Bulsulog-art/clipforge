import { fill, lifecycleText } from "@/content/dentvideo-lifecycle";
import { billingText } from "@/content/dentvideo-billing";
import { LOCALES, type Locale } from "@/content/dentvideo";
import { operatorAddress } from "@/content/legal";
import { CONTACT_EMAIL, COLORS, FONT, esc, renderEmail, type Brand, type Rendered } from "./email-layout";

/**
 * Lifecycle emails, rendered in the shared template (email-layout.ts):
 *
 *   welcome         after the first payment (transactional)
 *   start           day 0 — finish your preview
 *   sample          day 1 — here is your clinic's sample (its preview's titles)
 *   objections      day 3 — answers to the three common objections
 *   payment problem payment.failed / subscription.on_hold (transactional)
 *   not posted      paying clinic, nothing shared yet this week
 *   monthly         paying clinic, last month in three numbers
 *
 * and the unsubscribe page. Marketing mail (everything but welcome and the
 * payment problem) carries the unsubscribe link and the operator's postal
 * address. Pure: no I/O, no environment — prices and the counts come in
 * as arguments.
 */

export { CONTACT_EMAIL };
export type { Rendered };

/** "$29" in the reader's language — the same format the plan screen uses (Arabic keeps "$29"). */
export function usd(lang: string, amount: number): string {
  return new Intl.NumberFormat(lang === "ar" ? "en-US" : lang, { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(amount);
}

/** A clinic name fit for a subject line and a greeting. */
export function clinicLabel(name: string | null | undefined): string {
  return (name ?? "").replace(/[\r\n\t]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);
}

/** A line whose {clinic} came out empty, without the orphaned space or comma ("Hello ," → "Hello,"). */
export function tidy(s: string): string {
  return s
    .replace(/^\s*様、/, "")
    .replace(/\s+([,،:!])/g, "$1")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/** The operator's postal address in the reader's language, for marketing mail. */
export function postalAddress(lang: string): string {
  return operatorAddress(((LOCALES as readonly string[]).includes(lang) ? lang : "en") as Locale);
}

/** Welcome, right after the first payment: what happens next. Transactional. */
export function welcomeEmail(args: { language: string; clinicName: string; appUrl: string; brand?: Brand }): Rendered {
  const { lang, copy: c } = lifecycleText(args.language);
  const clinic = clinicLabel(args.clinicName);
  const vars = { clinic, email: CONTACT_EMAIL };
  return renderEmail({
    lang,
    subject: tidy(fill(c.welcome.subject, vars)).replace(/[,،]$/, ""),
    preheader: c.welcome.preheader,
    hello: tidy(fill(c.hello, vars)),
    blocks: [
      { kind: "p", text: fill(c.welcome.intro, vars) },
      { kind: "steps", items: c.welcome.steps.map((s) => ({ title: fill(s.title, vars), body: fill(s.body, vars) })) },
    ],
    button: { label: c.welcome.button, url: args.appUrl },
    signoff: c.signoff,
    footer: c.welcome.footer,
    brand: { ...args.brand, name: clinic },
  });
}

export type NudgeArgs = { language: string; clinicName: string; url: string; unsubscribeUrl: string; brand?: Brand };

function marketing(lang: string, c: ReturnType<typeof lifecycleText>["copy"], args: NudgeArgs, footer: string) {
  return {
    signoff: c.signoff,
    footer,
    address: postalAddress(lang),
    unsubscribe: { ask: c.unsubscribeAsk, label: c.unsubscribe, url: args.unsubscribeUrl },
    brand: { ...args.brand, name: clinicLabel(args.clinicName) },
  };
}

/** Day 0: you set up your clinic — your branded preview is saved, finish it. */
export function startEmail(args: NudgeArgs): Rendered {
  const { lang, copy: c } = lifecycleText(args.language);
  const clinic = clinicLabel(args.clinicName);
  const s = c.start;
  return renderEmail({
    lang,
    subject: s.subject,
    preheader: s.preheader,
    title: s.title,
    hello: tidy(fill(c.hello, { clinic })),
    blocks: [
      { kind: "p", text: tidy(fill(s.body, { clinic })) },
      { kind: "p", text: s.next },
    ],
    button: { label: s.button, url: args.url },
    afterButton: [c.contact],
    ...marketing(lang, c, args, c.nudgeFooter),
  });
}

/** Day 1: the clinic's own sample — the titles of the videos in its preview. */
export function sampleEmail(args: NudgeArgs & { titles: string[] }): Rendered {
  const { lang, copy: c } = lifecycleText(args.language);
  const clinic = clinicLabel(args.clinicName);
  const s = c.sample;
  const titles = args.titles.map((t) => t.trim()).filter(Boolean).slice(0, 4);
  return renderEmail({
    lang,
    subject: s.subject,
    preheader: s.preheader,
    title: s.title,
    hello: tidy(fill(c.hello, { clinic })),
    blocks: [
      ...(titles.length ? [{ kind: "p" as const, text: tidy(fill(s.intro, { clinic })) }, { kind: "list" as const, items: titles }] : []),
      { kind: "p", text: s.outro },
      { kind: "panel", text: s.whyUs },
    ],
    button: { label: s.button, url: args.url },
    afterButton: [c.contact],
    ...marketing(lang, c, args, c.nudgeFooter),
  });
}

/** Day 3: accuracy, time, cost — the three things that stop a dentist. */
export function objectionsEmail(args: NudgeArgs & { fromUsd: number }): Rendered {
  const { lang, copy: c } = lifecycleText(args.language);
  const clinic = clinicLabel(args.clinicName);
  const s = c.objections;
  const vars = { from: usd(lang, args.fromUsd) };
  return renderEmail({
    lang,
    subject: s.subject,
    preheader: s.preheader,
    title: s.title,
    hello: tidy(fill(c.hello, { clinic })),
    blocks: [
      { kind: "p", text: s.intro },
      { kind: "qa", items: s.qa.map((x) => ({ q: x.q, a: fill(x.a, vars) })) },
    ],
    button: { label: s.button, url: args.url },
    afterButton: [c.contact],
    ...marketing(lang, c, args, c.nudgeFooter),
  });
}

/** Paying clinic, nothing shared yet this week: a gentle nudge. */
export function notPostedEmail(args: NudgeArgs & { approved: number; pending: number }): Rendered {
  const { lang, copy: c } = lifecycleText(args.language);
  const clinic = clinicLabel(args.clinicName);
  const s = c.notPosted;
  const lines = [args.approved > 0 ? fill(s.approved, { n: args.approved }) : "", args.pending > 0 ? fill(s.pending, { n: args.pending }) : ""].filter(Boolean);
  return renderEmail({
    lang,
    subject: s.subject,
    preheader: s.preheader,
    title: s.title,
    hello: tidy(fill(c.hello, { clinic })),
    blocks: [{ kind: "list", items: lines }, { kind: "p", text: s.how }, { kind: "p", text: s.gentle, muted: true }],
    button: { label: s.button, url: args.url },
    ...marketing(lang, c, args, s.footer),
  });
}

export type MonthStats = { made: number; approved: number; shared: number };

/** "October 2026" in the reader's language (Arabic with Latin digits, like prices). */
export function monthLabel(lang: string, year: number, month: number): string {
  return new Intl.DateTimeFormat(lang === "ar" ? "ar-u-nu-latn" : lang, { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(year, month - 1, 15)));
}

/** Paying clinic, once a month: what was made, approved and shared last month. */
export function monthlyEmail(args: NudgeArgs & { year: number; month: number; stats: MonthStats }): Rendered {
  const { lang, copy: c } = lifecycleText(args.language);
  const clinic = clinicLabel(args.clinicName);
  const s = c.monthly;
  const month = monthLabel(lang, args.year, args.month);
  const nf = new Intl.NumberFormat(lang === "ar" ? "en-US" : lang);
  return renderEmail({
    lang,
    subject: fill(s.subject, { month }),
    preheader: s.preheader,
    title: fill(s.title, { month }),
    hello: tidy(fill(c.hello, { clinic })),
    blocks: [
      { kind: "p", text: tidy(fill(s.intro, { clinic })) },
      {
        kind: "stats",
        items: [
          { value: nf.format(args.stats.made), label: s.made },
          { value: nf.format(args.stats.approved), label: s.approved },
          { value: nf.format(args.stats.shared), label: s.shared },
        ],
      },
      { kind: "p", text: args.stats.shared > 0 ? s.sharedSome : s.sharedNone },
    ],
    button: { label: s.button, url: args.url },
    ...marketing(lang, c, args, s.footer),
  });
}

export type PaymentProblemKind = "failed" | "on_hold";
/**
 * How the clinic fixes it: the billing portal in Settings (DODO_API_KEY set),
 * a reply to us (no API key: we send a secure link), or — only once the old
 * subscription has ended, so a new one cannot double-charge — a fresh plan.
 */
export type PaymentFix = "portal" | "email" | "checkout";

/** "Your payment didn't go through" — what happened and the one way to fix it. Transactional (no unsubscribe). */
export function paymentProblemEmail(args: { language: string; clinicName: string; kind: PaymentProblemKind; fix: PaymentFix; appUrl: string; brand?: Brand }): Rendered {
  const { lang, copy: c } = billingText(args.language);
  const e = c.email;
  const clinic = clinicLabel(args.clinicName);
  const vars = { clinic, email: CONTACT_EMAIL };
  const what = args.kind === "failed" ? e.failedBody : e.holdBody;
  const how = fill(args.fix === "portal" ? e.fixPortal : args.fix === "checkout" ? e.fixCheckout : e.fixEmail, vars);
  const url = args.fix === "portal" ? `${args.appUrl}/settings#billing-title` : args.appUrl;
  return renderEmail({
    lang,
    subject: args.kind === "failed" ? e.failedSubject : e.holdSubject,
    preheader: e.preheader,
    hello: tidy(fill(e.hello, vars)),
    blocks: [
      { kind: "p", text: what },
      { kind: "panel", text: how },
    ],
    button: { label: e.button, url },
    signoff: e.signoff,
    footer: e.footer,
    brand: { ...args.brand, name: clinic },
  });
}

export type UnsubState = "confirm" | "done" | "invalid" | "error";

/**
 * The page the unsubscribe link opens, in the clinic's language.
 * "confirm" (GET) changes nothing: one button POSTs back to `action`, so a
 * link scanner that opens the URL cannot unsubscribe anyone (RFC 8058 §3).
 */
export function unsubscribePage(args: { language: string; state: UnsubState; homeUrl: string; action?: string }): string {
  const { lang, copy: c } = lifecycleText(args.language);
  const p = c.unsubPage;
  const [title, body] =
    args.state === "confirm"
      ? [p.confirmTitle, p.confirmBody]
      : args.state === "done"
        ? [p.title, p.body]
        : args.state === "invalid"
          ? [p.invalidTitle, p.invalidBody]
          : [p.errorTitle, p.errorBody];
  const rtl = lang === "ar";
  const TEAL = COLORS.teal;
  const btn = `display:inline-block;padding:12px 24px;border-radius:10px;font-family:${FONT};font-size:16px;font-weight:600;text-decoration:none`;
  const addr = esc(CONTACT_EMAIL);
  const rich = esc(fill(body, { email: CONTACT_EMAIL }))
    .split(addr)
    .join(`<a href="mailto:${addr}" dir="ltr" style="color:${TEAL};text-decoration:underline">${addr}</a>`);
  const action =
    args.state === "confirm" && args.action
      ? `<form method="post" action="${esc(args.action)}" style="margin:0 0 12px"><button type="submit" style="${btn};border:0;cursor:pointer;background:${TEAL};color:#fff">${esc(p.confirmButton)}</button></form>
<a href="${esc(args.homeUrl)}" style="color:${COLORS.muted};font-size:14px">${esc(p.back)}</a>`
      : `<a href="${esc(args.homeUrl)}" style="${btn};background:${TEAL};color:#fff">${esc(p.back)}</a>`;
  return `<!doctype html>
<html lang="${lang}" dir="${rtl ? "rtl" : "ltr"}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${esc(title)} · DentVideo</title></head>
<body style="margin:0;background:${COLORS.paper};font-family:${FONT};color:${COLORS.ink}">
<main style="max-width:520px;margin:0 auto;padding:48px 16px">
<p style="margin:0 0 16px;font-size:20px;font-weight:700"><span dir="ltr">Dent<span style="color:${TEAL}">Video</span></span></p>
<div style="background:#fff;border:1px solid ${COLORS.line};border-radius:16px;padding:28px">
<h1 style="margin:0 0 12px;font-size:22px;line-height:30px">${esc(title)}</h1>
<p style="margin:0 0 20px;font-size:16px;line-height:24px">${rich}</p>
${action}
</div></main></body></html>`;
}
