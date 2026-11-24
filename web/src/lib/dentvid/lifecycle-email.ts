import { fill, lifecycleText } from "@/content/dentvideo-lifecycle";
import { billingText } from "@/content/dentvideo-billing";
import { appText } from "@/content/dentvideo-app";
import { LOCALES, type Locale } from "@/content/dentvideo";
import { operatorAddress } from "@/content/legal";
import { CONTACT_EMAIL, COLORS, FONT, esc, helpCenterLink, renderEmail, type Brand, type Rendered } from "./email-layout";
import { formatDvPrice, type DvCurrency } from "./pricing";

/** An amount in a list currency (pricing.ts). */
export type DvMoney = { currency: DvCurrency; amount: number };

/**
 * Lifecycle emails, rendered in the shared template (email-layout.ts):
 *
 *   welcome         after the first payment (transactional)
 *   start           day 0 — finish your preview
 *   sample          day 1 — here is your clinic's sample (its preview's titles)
 *   objections      day 3 — answers to the three common objections
 *   payment problem payment.failed / subscription.on_hold (transactional)
 *   not posted      paying clinic, nothing shared or ticked as posted yet this week
 *   monthly         paying clinic, last month: made, approved, posted
 *
 * and the unsubscribe page. Marketing mail (everything but welcome and the
 * payment problem) carries the unsubscribe link and the operator's postal
 * address. Pure: no I/O, no environment — prices and the counts come in
 * as arguments.
 */

export { CONTACT_EMAIL };
export type { Rendered };

/** "$49", "49 €", "1.490 TL" in the reader's language — the same format the plan screen uses (pricing.ts). */
export function money(lang: string, price: DvMoney): string {
  return formatDvPrice(lang, price.currency, price.amount);
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

/**
 * The app's own button labels, as the dentist sees them, for the copy that
 * names them ({post}, {mark}): read from the app's strings, never retyped.
 */
export function appLabels(lang: string): { post: string; mark: string } {
  const t = appText(((LOCALES as readonly string[]).includes(lang) ? lang : "en") as Locale).library;
  return { post: t.review.openPost, mark: t.post.markPosted };
}

/** The operator's postal address in the reader's language, for marketing mail. */
export function postalAddress(lang: string): string {
  return operatorAddress(((LOCALES as readonly string[]).includes(lang) ? lang : "en") as Locale);
}

/**
 * Welcome, right after the first payment. Transactional. It answers the four
 * things a new clinic wonders: when the first videos come (usually within an hour,
 * by email), how to review and approve (software-assisted check, you approve,
 * nothing published before), how to post (the app's "Post it" button, then one
 * tap saves the video and copies the caption, a suggested time, we never post
 * for you), and what then (every Monday) — and
 * how to reach a person (reply, hello@dentvideo.com).
 */
export function welcomeEmail(args: { language: string; clinicName: string; appUrl: string; brand?: Brand }): Rendered {
  const { lang, copy: c } = lifecycleText(args.language);
  const clinic = clinicLabel(args.clinicName);
  const vars = { clinic, email: CONTACT_EMAIL, post: appLabels(lang).post };
  return renderEmail({
    lang,
    subject: c.welcome.subject,
    preheader: c.welcome.preheader,
    title: c.welcome.title,
    hello: tidy(fill(c.hello, vars)),
    blocks: [
      { kind: "p", text: fill(c.welcome.intro, vars) },
      { kind: "steps", items: c.welcome.steps.map((s) => ({ title: fill(s.title, vars), body: fill(s.body, vars) })) },
      { kind: "panel", text: fill(c.welcome.help, vars) },
    ],
    button: { label: c.welcome.button, url: args.appUrl },
    // The panel above already says how to reach us.
    help: false,
    // Everything a new clinic wonders in the first week, answered step by step.
    helpLink: helpCenterLink(lang),
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
    ...marketing(lang, c, args, c.nudgeFooter),
  });
}

/** Day 3: accuracy, time, cost — the three things that stop a dentist. */
export function objectionsEmail(args: NudgeArgs & { from: DvMoney }): Rendered {
  const { lang, copy: c } = lifecycleText(args.language);
  const clinic = clinicLabel(args.clinicName);
  const s = c.objections;
  const vars = { from: money(lang, args.from), post: appLabels(lang).post };
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
    ...marketing(lang, c, args, c.nudgeFooter),
  });
}

/** Paying clinic, nothing shared or ticked as posted yet this week: a gentle nudge. */
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
    blocks: [{ kind: "list", items: lines }, { kind: "p", text: fill(s.how, { post: appLabels(lang).post }) }, { kind: "p", text: s.gentle, muted: true }],
    button: { label: s.button, url: args.url },
    helpLink: helpCenterLink(lang, "share"),
    ...marketing(lang, c, args, s.footer),
  });
}

/**
 * Last month's numbers. `posted`: approved videos ticked as posted
 * (dentvid_items.posted_at); null or absent when that cannot be read, and
 * then the video_shared event count is the only, rougher, signal.
 */
export type MonthStats = { made: number; approved: number; shared: number; posted?: number | null };

/** "October 2026" in the reader's language (Arabic with Latin digits, like prices). */
export function monthLabel(lang: string, year: number, month: number): string {
  return new Intl.DateTimeFormat(lang === "ar" ? "ar-u-nu-latn" : lang, { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(year, month - 1, 15)));
}

/**
 * Paying clinic, once a month: what was made, approved and posted last
 * month. Posted is "X of Y approved", so it is clipped to the approved
 * count; when it is unknown the summary shows two numbers, not a guess.
 */
export function monthlyEmail(args: NudgeArgs & { year: number; month: number; stats: MonthStats }): Rendered {
  const { lang, copy: c } = lifecycleText(args.language);
  const clinic = clinicLabel(args.clinicName);
  const s = c.monthly;
  const month = monthLabel(lang, args.year, args.month);
  const nf = new Intl.NumberFormat(lang === "ar" ? "en-US" : lang);
  const { made, approved, shared } = args.stats;
  const posted = typeof args.stats.posted === "number" && Number.isFinite(args.stats.posted) ? Math.max(0, Math.min(Math.floor(args.stats.posted), approved)) : null;
  // Thanks only for what we can see went out: the ticks, or (without them) at least one share.
  const wentOut = posted !== null ? posted > 0 : shared > 0;
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
          { value: nf.format(made), label: s.made },
          { value: nf.format(approved), label: s.approved },
          ...(posted !== null ? [{ value: nf.format(posted), label: s.posted }] : []),
        ],
      },
      ...(posted ? [{ kind: "p" as const, text: fill(s.postedLine, { n: nf.format(posted), total: nf.format(approved) }) }] : []),
      { kind: "p", text: wentOut ? s.sharedSome : fill(s.sharedNone, { mark: appLabels(lang).mark }) },
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
  const subject = args.kind === "failed" ? e.failedSubject : e.holdSubject;
  return renderEmail({
    lang,
    subject,
    preheader: e.preheader,
    // Said once, big, at the top: what happened.
    title: subject,
    hello: tidy(fill(e.hello, vars)),
    blocks: [
      { kind: "p", text: what },
      { kind: "panel", text: how },
    ],
    button: { label: e.button, url },
    helpLink: helpCenterLink(lang, "payment-failed"),
    // One signature in every DentVideo email (the billing copy has its own spelling of it in a few languages).
    signoff: lifecycleText(lang).copy.signoff,
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
