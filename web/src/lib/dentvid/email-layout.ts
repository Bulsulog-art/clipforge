/**
 * The one DentVideo email template. Every message the product sends — the
 * sign-in code, the password reset, "your week is ready", the welcome, the
 * reminders to an unpaid clinic, the payment problem, the weekly posting
 * nudge and the monthly summary — is built from these blocks, so they all
 * look, read and behave the same, and all of them look like dentvideo.com.
 *
 *   Brand          the landing's look, not a generic SaaS mail: warm sand
 *                  page, white card, the display serif for the one headline
 *                  (Instrument Serif where installed, Georgia everywhere
 *                  else; Mincho for Japanese, the bold sans for Arabic, as
 *                  on the site), DentVideo teal for the one button, cream
 *                  label on it. The real DentVideo mark (the molar tile) as a
 *                  hosted PNG next to the wordmark in live text, so the
 *                  header still reads "DentVideo" with images off and never
 *                  turns into dark-on-dark in a dark inbox. Always DentVideo's
 *                  own colours: a clinic's colour or logo never restyles a
 *                  DentVideo email. Signed by the DentVideo team, no names.
 *   Mobile first   one column, at most 600 px, 16 px body text, a button that
 *                  fills the width on a phone, 44 px+ tap targets.
 *   Mail clients   table layout and inline styles (Gmail strips <style> in
 *                  some views), a fixed-width ghost table and a VML button for
 *                  Outlook on Windows (which ignores max-width and
 *                  border-radius), Arial/Georgia forced in Outlook (it would
 *                  fall back to Times), no web fonts relied on, no background
 *                  images, the link also written out under the button.
 *   Help           every email ends with the same short human line: reply to
 *                  this email, a person reads it (content/dentvideo-support.ts).
 *   Footer         why they get it, DentVideo · hello@dentvideo.com, and the
 *                  operator's registered name and address.
 *   Dark mode      color-scheme "light dark" plus a prefers-color-scheme block
 *                  (and Outlook.com's [data-ogsc] hooks) that recolours the
 *                  page; the colours chosen survive Gmail's forced inversion.
 *   RTL            Arabic flips the whole message (dir="rtl", right aligned);
 *                  the brand, links, codes and email addresses stay LTR.
 *   Accessible     lang + dir, a <title>, one <h1>, role="presentation" on
 *                  layout tables, alt text on every image, text contrast of
 *                  at least 4.5:1, underlined links.
 *   Plain text     every message has a text part made from the same blocks.
 *
 * Pure: no I/O, no environment.
 */

import { companyLine, fillSupport, supportText, SUPPORT_EMAIL } from "@/content/dentvideo-support";
import { lifecycleText } from "@/content/dentvideo-lifecycle";

export type Brand = {
  /** The clinic's name (kept for callers; DentVideo emails are always in DentVideo's own look). */
  name?: string;
  /** Accepted for compatibility, not shown: a DentVideo email is signed and styled DentVideo. */
  logoUrl?: string | null;
  /** Accepted for compatibility, not used: the accent is always DentVideo teal. */
  color?: string | null;
};

export type Thumb = { url: string; title: string; href: string };

/**
 * One video in the "your week is ready" email: its poster, title, the start
 * of its ready-to-post caption, when to post it, and one link — "Approve &
 * share" (the signed one-video page), "Save & share", or "Check it in the app".
 */
export type VideoRow = { title: string; thumbUrl?: string | null; caption?: string; slot?: string; href: string; action: string };

export type Block =
  | { kind: "p"; text: string; muted?: boolean }
  | { kind: "list"; items: string[] }
  | { kind: "steps"; items: { title: string; body: string }[] }
  | { kind: "panel"; text: string }
  | { kind: "qa"; items: { q: string; a: string }[] }
  /** A one-time code, big and spaced; `note` (e.g. how long it works) sits under it in the same box. */
  | { kind: "code"; code: string; note?: string }
  | { kind: "stats"; items: { value: string; label: string }[] }
  | { kind: "thumbs"; items: Thumb[] }
  | { kind: "videos"; heading?: string; items: VideoRow[] };

export type EmailSpec = {
  lang: string;
  subject: string;
  /** The line inbox lists show after the subject. */
  preheader: string;
  /** The one big line at the top of the card. */
  title?: string;
  hello?: string;
  blocks: Block[];
  /** The one action. */
  button?: { label: string; url: string };
  /**
   * A second, quieter way: "<ask> <label>" with the label as a link, or — with
   * style "button" — an outlined button under the main one (never filled: the
   * main button stays the one obvious action).
   */
  secondary?: { ask: string; label: string; url: string; style?: "link" | "button" };
  /** A short line above the title ("This week · 9 Nov"). */
  eyebrow?: string;
  /**
   * The help line under the sign-off. Defaults to the shared "reply to this
   * email" line in the email's language; false leaves it out (when the body
   * already says it).
   */
  help?: string | false;
  /** Small text under the button (e.g. "Nothing is published until you approve it"). */
  afterButton?: string[];
  /** Defaults to "The DentVideo team" in the email's language: every email is signed DentVideo. */
  signoff?: string;
  /** Why they get this email. */
  footer: string;
  unsubscribe?: { ask: string; label: string; url: string };
  brand?: Brand;
};

export type Rendered = { subject: string; html: string; text: string };

export const CONTACT_EMAIL = SUPPORT_EMAIL;

/** The DentVideo mark (the molar tile), 128 px PNG shown at 40 px. Hosted with the site (public/dentvideo/email). */
export const MARK_URL = "https://dentvideo.com/dentvideo/email/mark.png";
export const SITE_URL = "https://dentvideo.com/";

/** dentvideo.com's palette (tailwind.config.ts "dv", docs/BRAND.md). */
export const COLORS = {
  page: "#f3eee5",
  paper: "#faf7f2",
  card: "#ffffff",
  ink: "#14211f",
  body: "#3d4c49",
  muted: "#5b6a67",
  line: "#e8e1d5",
  panel: "#f6f1e8",
  tint: "#eef5f2",
  tintLine: "#d6e7e1",
  teal: "#0f5c5c",
  tealDeep: "#0b3f3e",
  cream: "#f7f1e7",
} as const;

const DARK = { page: "#0c1312", card: "#151f1d", ink: "#eef3f2", body: "#d2dcda", muted: "#a3b2af", line: "#283533", panel: "#1c2826", tint: "#173230", link: "#8fd1c6", button: "#167269" };

export const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Helvetica,Arial,'Hiragino Sans','Yu Gothic','Noto Sans JP','Geeza Pro','Noto Sans Arabic',sans-serif";

/** The headline face per language, the landing's display rules: the serif, Mincho for Japanese, the bold sans for Arabic. */
function headFont(lang: string): { family: string; weight: number; size: number; line: number; spacing: string } {
  if (lang === "ja") return { family: "'Hiragino Mincho ProN','Yu Mincho','YuMincho','Noto Serif JP','Noto Serif CJK JP',serif", weight: 600, size: 25, line: 36, spacing: "0.02em" };
  if (lang === "ar") return { family: "'Geeza Pro','Noto Sans Arabic','Segoe UI',Tahoma,sans-serif", weight: 700, size: 25, line: 38, spacing: "0" };
  return { family: "'Instrument Serif',Georgia,'Times New Roman',serif", weight: 400, size: 32, line: 38, spacing: "-0.01em" };
}

export const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/* ------------------------------------------------------------------ colour */

function rgb(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function luminance([r, g, b]: [number, number, number]): number {
  const f = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

/** WCAG contrast ratio of two "#RRGGBB" colours. */
export function contrast(a: string, b: string): number {
  const x = rgb(a);
  const y = rgb(b);
  if (!x || !y) return 1;
  const [hi, lo] = [luminance(x), luminance(y)].sort((p, q) => q - p);
  return (hi + 0.05) / (lo + 0.05);
}

/* ------------------------------------------------------------------ helpers */

const T = COLORS.teal;

/** Escaped text with the contact address made a mailto link (kept LTR). */
function rich(s: string): string {
  const e = esc(s);
  const addr = esc(CONTACT_EMAIL);
  return e.split(addr).join(`<a href="mailto:${addr}" dir="ltr" class="dv-link" style="color:${T};text-decoration:underline">${addr}</a>`);
}

/** Inbox preview text, padded so the body does not leak into the preview line. */
function preheader(s: string): string {
  return `<div class="dv-pre" aria-hidden="true" style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all">${esc(s)}${"&#847;&zwnj;&nbsp;".repeat(40)}</div>`;
}

function style(lang: string): string {
  const h = headFont(lang);
  return `<style>
:root{color-scheme:light dark;supported-color-schemes:light dark}
body{margin:0!important;padding:0!important;width:100%!important}
a{text-decoration:underline}
.dv-card,.dv-card p,.dv-card h1{overflow-wrap:break-word;word-wrap:break-word}
@media (max-width:600px){
.dv-card{padding:32px 22px 28px!important;border-radius:16px!important}
.dv-outer{padding:22px 10px 28px!important}
.dv-btn,.dv-btn2,.dv-btnc{width:100%!important}
.dv-btn a,.dv-btn2 a{display:block!important;min-width:0!important;box-sizing:border-box;text-align:center!important}
.dv-thumb{display:inline-block!important;width:50%!important}
.dv-h1{font-size:${h.size - 4}px!important;line-height:${h.line - 4}px!important}
.dv-code{font-size:32px!important;letter-spacing:7px!important}
}
@media (prefers-color-scheme:dark){
.dv-bg{background:${DARK.page}!important}
.dv-card{background:${DARK.card}!important;border-color:${DARK.line}!important}
.dv-ink{color:${DARK.ink}!important}
.dv-body{color:${DARK.body}!important}
.dv-muted{color:${DARK.muted}!important}
.dv-panel{background:${DARK.panel}!important}
.dv-tint{background:${DARK.tint}!important;border-color:${DARK.tint}!important}
.dv-rule{border-color:${DARK.line}!important}
.dv-link{color:${DARK.link}!important}
.dv-mark{color:${DARK.link}!important}
.dv-btnc,.dv-btn a{background:${DARK.button}!important}
.dv-btn2{border-color:${DARK.link}!important}
.dv-chip{color:${DARK.link}!important;border-color:${DARK.link}!important}
}
[data-ogsc] .dv-bg{background:${DARK.page}!important}
[data-ogsc] .dv-card{background:${DARK.card}!important}
[data-ogsc] .dv-ink{color:${DARK.ink}!important}
[data-ogsc] .dv-body{color:${DARK.body}!important}
[data-ogsc] .dv-muted{color:${DARK.muted}!important}
[data-ogsc] .dv-panel{background:${DARK.panel}!important}
[data-ogsc] .dv-tint{background:${DARK.tint}!important}
[data-ogsc] .dv-link,[data-ogsc] .dv-mark,[data-ogsc] .dv-chip{color:${DARK.link}!important}
</style>
<!--[if mso]><style>body,table,td,p,a,span{font-family:Arial,Helvetica,sans-serif!important}${lang === "ja" || lang === "ar" ? "" : "h1{font-family:Georgia,serif!important}"}</style><noscript><xml><o:OfficeDocumentSettings xmlns:o="urn:schemas-microsoft-com:office:office"><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->`;
}

/* ------------------------------------------------------------------ blocks */

function blockHtml(b: Block, ctx: { rtl: boolean; align: string }): string {
  const { rtl, align } = ctx;
  const P = `margin:0 0 16px;font-size:16px;line-height:26px;color:${COLORS.body}`;
  switch (b.kind) {
    case "p":
      return b.muted
        ? `<p class="dv-muted" style="margin:0 0 14px;font-size:14px;line-height:22px;color:${COLORS.muted}">${rich(b.text)}</p>`
        : `<p class="dv-body" style="${P}">${rich(b.text)}</p>`;
    case "list":
      return (
        `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:2px 0 18px">` +
        b.items
          .map(
            (it) =>
              `<tr><td width="20" valign="top" class="dv-mark" style="padding:3px 0;font-size:16px;line-height:26px;color:${T};font-weight:700">&#8226;</td>` +
              `<td class="dv-body" style="padding:3px 0;font-size:16px;line-height:26px;color:${COLORS.body};text-align:${align}">${rich(it)}</td></tr>`,
          )
          .join("") +
        `</table>`
      );
    case "steps":
      return (
        `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:6px 0 10px">` +
        b.items
          .map((s, i) => {
            const last = i === b.items.length - 1;
            return (
              `<tr><td width="44" valign="top" style="padding:0 0 ${last ? "8px" : "20px"}"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td width="30" height="30" align="center" valign="middle" class="dv-tint dv-mark" bgcolor="${COLORS.tint}" style="width:30px;height:30px;border-radius:15px;background:${COLORS.tint};color:${T};font-family:Georgia,'Times New Roman',serif;font-size:15px;font-weight:700;line-height:30px;text-align:center">${i + 1}</td></tr></table></td>` +
              `<td valign="top" style="padding:3px 0 ${last ? "8px" : "20px"};text-align:${align}"><p class="dv-ink" style="margin:0 0 3px;font-size:16px;line-height:24px;font-weight:600;color:${COLORS.ink}">${esc(s.title)}</p><p class="dv-body" style="margin:0;font-size:15px;line-height:24px;color:${COLORS.body}">${rich(s.body)}</p></td></tr>`
            );
          })
          .join("") +
        `</table>`
      );
    case "panel":
      return (
        `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0 18px"><tr>` +
        `<td class="dv-tint" bgcolor="${COLORS.tint}" style="background:${COLORS.tint};border-radius:12px;padding:16px 18px;font-size:15px;line-height:24px;text-align:${align}"><span class="dv-body" style="color:${COLORS.body}">${rich(b.text)}</span></td></tr></table>`
      );
    case "qa":
      return b.items
        .map(
          (x, i) =>
            `<p class="dv-ink" style="margin:${i === 0 ? "4px" : "0"} 0 4px;font-size:16px;line-height:24px;font-weight:600;color:${COLORS.ink}">${esc(x.q)}</p>` +
            `<p class="dv-body" style="margin:0 0 18px;font-size:15px;line-height:24px;color:${COLORS.body}">${rich(x.a)}</p>`,
        )
        .join("");
    case "code":
      return (
        `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:6px 0 22px"><tr><td align="center" class="dv-tint" bgcolor="${COLORS.tint}" style="background:${COLORS.tint};border:1px solid ${COLORS.tintLine};border-radius:14px;padding:24px 12px 20px;text-align:center">` +
        // letter-spacing adds space after the last digit too: the same indent on the left keeps the code centred.
        `<span dir="ltr" class="dv-code dv-mark" style="display:inline-block;font-family:${FONT};font-size:40px;line-height:46px;font-weight:700;letter-spacing:10px;text-indent:10px;color:${COLORS.tealDeep};font-variant-numeric:tabular-nums;white-space:nowrap">${esc(b.code)}</span>` +
        (b.note ? `<p class="dv-muted" style="margin:10px 0 0;font-size:13px;line-height:19px;color:${COLORS.muted};text-align:center">${esc(b.note)}</p>` : "") +
        `</td></tr></table>`
      );
    case "stats":
      return (
        `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0 20px;border-collapse:separate;border-spacing:0"><tr>` +
        b.items
          .map(
            (s, i) =>
              `<td align="center" valign="top" width="${Math.floor(100 / b.items.length)}%" class="dv-rule" style="padding:6px 6px 4px;${i > 0 ? `border-${rtl ? "right" : "left"}:1px solid ${COLORS.line};` : ""}text-align:center"><p class="dv-mark" style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:36px;line-height:42px;font-weight:400;color:${T}">${esc(s.value)}</p><p class="dv-muted" style="margin:4px 0 0;font-size:13px;line-height:18px;color:${COLORS.muted}">${esc(s.label)}</p></td>`,
          )
          .join("") +
        `</tr></table>`
      );
    case "videos":
      return (
        (b.heading ? `<p class="dv-ink" style="margin:8px 0 14px;font-size:16px;line-height:24px;font-weight:600;color:${COLORS.ink}">${esc(b.heading)}</p>` : "") +
        `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 10px">` +
        b.items
          .map((v, i) => {
            const img =
              v.thumbUrl && /^https:\/\//.test(v.thumbUrl)
                ? `<a href="${esc(v.href)}" style="text-decoration:none"><img src="${esc(v.thumbUrl)}" alt="" width="72" height="128" style="display:block;width:72px;height:128px;border-radius:10px;border:0;object-fit:cover;background:${COLORS.panel}"></a>`
                : `<div class="dv-panel" style="width:72px;height:128px;border-radius:10px;background:${COLORS.panel}"></div>`;
            const pad = rtl ? "padding:0 16px 0 0" : "padding:0 0 0 16px";
            const top = i === 0 ? "" : `border-top:1px solid ${COLORS.line};`;
            return (
              `<tr><td class="dv-rule" style="${top}padding:${i === 0 ? "0" : "16px"} 0 16px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>` +
              `<td width="72" valign="top">${img}</td>` +
              `<td valign="top" style="${pad};text-align:${align}">` +
              `<p class="dv-ink" style="margin:0 0 3px;font-size:15px;line-height:22px;font-weight:600;color:${COLORS.ink}">${esc(v.title)}</p>` +
              (v.slot ? `<p class="dv-muted" style="margin:0 0 6px;font-size:13px;line-height:18px;color:${COLORS.muted}">${esc(v.slot)}</p>` : "") +
              (v.caption ? `<p class="dv-body" dir="auto" style="margin:0 0 10px;font-size:13px;line-height:20px;color:${COLORS.body}">${esc(v.caption)}</p>` : "") +
              // Outlined, so the one filled button below stays the main action.
              `<a href="${esc(v.href)}" class="dv-chip" style="display:inline-block;padding:8px 14px;border:1.5px solid ${T};border-radius:999px;color:${T};font-size:14px;line-height:18px;font-weight:600;text-decoration:none">${esc(v.action)}</a>` +
              `</td></tr></table></td></tr>`
            );
          })
          .join("") +
        `</table>`
      );
    case "thumbs":
      return (
        `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 12px"><tr><td style="font-size:0;line-height:0;text-align:${align}">` +
        b.items
          .map(
            (t) =>
              `<div class="dv-thumb" style="display:inline-block;width:25%;max-width:126px;vertical-align:top;padding:0 0 10px"><a href="${esc(t.href)}" style="display:block;padding:0 4px;text-decoration:none"><img src="${esc(t.url)}" alt="${esc(t.title)}" width="118" style="display:block;width:100%;max-width:118px;height:auto;border-radius:10px;border:0;aspect-ratio:9/16;object-fit:cover;background:${COLORS.panel}"><span class="dv-body" style="display:block;margin-top:6px;font-size:12px;line-height:16px;color:${COLORS.body};text-align:${align}">${esc(t.title)}</span></a></div>`,
          )
          .join("") +
        `</td></tr></table>`
      );
  }
}

function blockText(b: Block): string {
  switch (b.kind) {
    case "p":
      return b.text;
    case "list":
      return b.items.map((i) => `• ${i}`).join("\n");
    case "steps":
      return b.items.map((s, i) => `${i + 1}. ${s.title}\n   ${s.body}`).join("\n\n");
    case "panel":
      return b.text;
    case "qa":
      return b.items.map((x) => `${x.q}\n${x.a}`).join("\n\n");
    case "code":
      return [b.code, b.note].filter(Boolean).join("\n");
    case "stats":
      return b.items.map((s) => `${s.label}: ${s.value}`).join("\n");
    case "thumbs":
      return b.items.map((t) => `• ${t.title}`).join("\n");
    case "videos":
      return [b.heading ?? "", ...b.items.map((v) => [`• ${v.title}${v.slot ? ` (${v.slot})` : ""}`, v.caption ? `  ${v.caption}` : "", `  ${v.action}: ${v.href}`].filter(Boolean).join("\n"))].filter(Boolean).join("\n\n");
  }
}

/* ------------------------------------------------------------------ render */

/**
 * The header: the DentVideo mark (hosted PNG, alt "DentVideo") and the
 * wordmark in live text, "Dent" in ink and "Video" in teal like the logo,
 * centred above the card and always left to right.
 */
function header(): string {
  return (
    `<tr><td align="center" style="padding:0 0 22px;text-align:center"><a href="${SITE_URL}" style="text-decoration:none" dir="ltr"><table role="presentation" align="center" dir="ltr" cellpadding="0" cellspacing="0" border="0"><tr>` +
    `<td width="40" valign="middle"><img src="${MARK_URL}" alt="DentVideo" width="40" height="40" style="display:block;width:40px;height:40px;border:0;border-radius:10px;font-family:${FONT};font-size:12px;line-height:40px;color:${T}"></td>` +
    `<td valign="middle" style="padding:0 0 0 11px;font-family:${FONT};font-size:22px;line-height:26px;font-weight:700;letter-spacing:-0.5px;white-space:nowrap" aria-hidden="true"><span dir="ltr" class="dv-ink" style="color:${COLORS.ink}">Dent<span class="dv-mark" style="color:${T}">Video</span></span></td>` +
    `</tr></table></a></td></tr>`
  );
}

/** The main button: a VML round rectangle for Outlook on Windows, a padded link in a teal cell everywhere else. */
function primaryButton(b: { label: string; url: string }): string {
  const url = esc(b.url);
  const label = esc(b.label);
  return (
    `<!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${url}" style="height:52px;v-text-anchor:middle;width:320px" arcsize="20%" stroke="f" fillcolor="${T}"><w:anchorlock/><center style="color:${COLORS.cream};font-family:Arial,sans-serif;font-size:16px;font-weight:bold">${label}</center></v:roundrect><![endif]-->` +
    `<!--[if !mso]><!-->` +
    `<table role="presentation" class="dv-btn" cellpadding="0" cellspacing="0" border="0" style="margin:12px 0 0"><tr><td class="dv-btnc" bgcolor="${T}" style="border-radius:10px;background:${T};text-align:center"><a href="${url}" style="display:inline-block;min-width:200px;padding:16px 32px;font-family:${FONT};font-size:16px;font-weight:600;line-height:20px;letter-spacing:0.1px;color:${COLORS.cream};text-decoration:none;border-radius:10px">${label}</a></td></tr></table>` +
    `<!--<![endif]-->`
  );
}

/** The second action as an outlined button: clearly secondary, still one tap. */
function outlineButton(b: { label: string; url: string }): string {
  return `<table role="presentation" class="dv-btn2" cellpadding="0" cellspacing="0" border="0" style="margin:12px 0 0;border:1.5px solid ${T};border-radius:10px"><tr><td style="border-radius:10px;text-align:center"><a href="${esc(b.url)}" class="dv-link" style="display:inline-block;min-width:196px;padding:14px 28px;font-family:${FONT};font-size:15px;font-weight:600;line-height:20px;color:${T};text-decoration:none;border-radius:10px">${esc(b.label)}</a></td></tr></table>`;
}

export function renderEmail(s: EmailSpec): Rendered {
  const rtl = s.lang === "ar";
  const dir = rtl ? "rtl" : "ltr";
  const align = rtl ? "right" : "left";
  const ctx = { rtl, align };
  const chrome = supportText(s.lang).copy.email;
  const help = s.help === false ? null : fillSupport(s.help ?? chrome.help, { email: CONTACT_EMAIL });
  const company = companyLine(s.lang);
  const signoff = s.signoff ?? lifecycleText(s.lang).copy.signoff;
  const h = headFont(s.lang);
  const M = `class="dv-muted" style="margin:0;font-size:12px;line-height:19px;color:${COLORS.muted};text-align:center"`;

  const button = s.button
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="${align}" style="text-align:${align}">${primaryButton(s.button)}</td></tr></table>` +
      `<p class="dv-muted" style="margin:16px 0 0;font-size:12px;line-height:18px;color:${COLORS.muted};text-align:${align}">${esc(chrome.linkFallback)}<br><a href="${esc(s.button.url)}" dir="ltr" class="dv-link" style="color:${T};word-break:break-all">${esc(s.button.url)}</a></p>`
    : "";
  const second = !s.secondary
    ? ""
    : s.secondary.style === "button"
      ? `<p class="dv-body" style="margin:26px 0 0;font-size:15px;line-height:22px;color:${COLORS.body}">${esc(s.secondary.ask)}</p><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="${align}" style="text-align:${align}">${outlineButton(s.secondary)}</td></tr></table>`
      : `<p class="dv-body" style="margin:20px 0 0;font-size:15px;line-height:23px;color:${COLORS.body}">${esc(s.secondary.ask)} <a href="${esc(s.secondary.url)}" class="dv-link" style="color:${T};font-weight:600;text-decoration:underline">${esc(s.secondary.label)}</a></p>`;
  const after = (s.afterButton ?? []).map((t) => `<p class="dv-muted" style="margin:18px 0 0;font-size:14px;line-height:22px;color:${COLORS.muted}">${rich(t)}</p>`).join("");
  const helpRow = help
    ? `<tr><td class="dv-rule" style="padding:22px 0 0;border-top:1px solid ${COLORS.line};text-align:${align}"><p class="dv-muted" style="margin:0;font-size:14px;line-height:22px;color:${COLORS.muted}">${rich(help)}</p></td></tr>`
    : "";
  const unsub = s.unsubscribe
    ? ` ${esc(s.unsubscribe.ask)} <a href="${esc(s.unsubscribe.url)}" class="dv-muted" style="color:${COLORS.muted};text-decoration:underline">${esc(s.unsubscribe.label)}</a>`
    : "";

  const html = `<!doctype html>
<html lang="${esc(s.lang)}" dir="${dir}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="X-UA-Compatible" content="IE=edge"><meta name="x-apple-disable-message-reformatting"><meta name="format-detection" content="telephone=no,date=no,address=no,email=no"><meta name="color-scheme" content="light dark"><meta name="supported-color-schemes" content="light dark"><title>${esc(s.subject)}</title>${style(s.lang)}</head>
<body dir="${dir}" class="dv-bg" style="margin:0;padding:0;background:${COLORS.page};font-family:${FONT};color:${COLORS.ink};-webkit-text-size-adjust:100%;text-align:${align}${s.lang === "ja" ? ";line-break:strict" : ""}">
${preheader(s.preheader)}
<table role="presentation" class="dv-bg" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${COLORS.page}" style="background:${COLORS.page}"><tr><td align="center" class="dv-outer" style="padding:40px 16px 44px">
<!--[if mso]><table role="presentation" width="600" align="center" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
<table role="presentation" dir="${dir}" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;text-align:${align}">
${header()}
<tr><td class="dv-card" bgcolor="${COLORS.card}" style="background:${COLORS.card};border:1px solid ${COLORS.line};border-radius:20px;padding:44px 48px 36px;font-family:${FONT};text-align:${align}">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding:0 0 ${help ? "28px" : "0"};text-align:${align}">
${s.eyebrow ? `<p class="dv-mark" style="margin:0 0 10px;font-size:12px;line-height:18px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:${T}">${esc(s.eyebrow)}</p>` : ""}
${s.title ? `<h1 class="dv-ink dv-h1" style="margin:0 0 20px;font-family:${h.family};font-size:${h.size}px;line-height:${h.line}px;font-weight:${h.weight};letter-spacing:${h.spacing};color:${COLORS.ink}">${esc(s.title)}</h1>` : ""}
${s.hello ? `<p class="dv-body" style="margin:0 0 16px;font-size:16px;line-height:26px;color:${COLORS.body}">${esc(s.hello)}</p>` : ""}
${s.blocks.map((b) => blockHtml(b, ctx)).join("\n")}
${button}
${second}
${after}
${signoff ? `<p class="dv-ink" style="margin:28px 0 0;font-size:16px;line-height:24px;font-weight:600;color:${COLORS.ink}">${esc(signoff)}</p>` : ""}
</td></tr>${helpRow}</table>
</td></tr>
<tr><td style="padding:26px 12px 0;text-align:center">
<p ${M}>${esc(s.footer)}${unsub}</p>
<p ${M.replace("margin:0", "margin:10px 0 0")}><span dir="ltr"><a href="${SITE_URL}" class="dv-muted" style="color:${COLORS.muted};text-decoration:none;font-weight:600">DentVideo</a> &middot; <a href="mailto:${esc(CONTACT_EMAIL)}" class="dv-muted" style="color:${COLORS.muted};text-decoration:underline">${esc(CONTACT_EMAIL)}</a></span></p>
<p ${M.replace("margin:0", "margin:2px 0 0")}><span dir="ltr">${esc(company)}</span></p>
</td></tr>
</table>
<!--[if mso]></td></tr></table><![endif]-->
</td></tr></table></body></html>`;

  const text = [
    s.eyebrow,
    s.title,
    s.hello,
    ...s.blocks.map(blockText),
    s.button ? `${s.button.label}: ${s.button.url}` : undefined,
    s.secondary ? `${s.secondary.ask} ${s.secondary.label}: ${s.secondary.url}` : undefined,
    ...(s.afterButton ?? []),
    signoff,
    help ?? undefined,
    ["-- ", s.footer, s.unsubscribe ? `${s.unsubscribe.ask} ${s.unsubscribe.label}: ${s.unsubscribe.url}` : "", `DentVideo · ${CONTACT_EMAIL} · dentvideo.com`, company].filter(Boolean).join("\n"),
  ]
    .filter((p): p is string => typeof p === "string" && p.trim() !== "")
    .join("\n\n");

  return { subject: s.subject, html, text };
}
