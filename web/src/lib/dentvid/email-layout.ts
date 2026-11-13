/**
 * The one DentVideo email template. Every message the product sends — the
 * sign-in code, the password reset, "your week is ready", the welcome, the
 * reminders to an unpaid clinic, the payment problem, the weekly posting
 * nudge and the monthly summary — is built from these blocks, so they all
 * look, read and behave the same.
 *
 *   Mobile first   one column, at most 560 px, 16 px body text, a button that
 *                  fills the width on a phone, 44 px+ tap targets.
 *   Mail clients   table layout and inline styles (Gmail strips <style> in
 *                  some views), a bgcolor button Outlook draws, no web fonts,
 *                  no background images, the link also written out in plain
 *                  sight under the button.
 *   Dark mode      color-scheme "light dark" plus a prefers-color-scheme block
 *                  (and Outlook.com's [data-ogsc] hooks) that recolours the
 *                  page; the colours chosen survive Gmail's forced inversion.
 *   RTL            Arabic flips the whole message (dir="rtl", right aligned);
 *                  the brand, links, codes and email addresses stay LTR.
 *   Accessible     lang + dir, a <title>, one <h1>, role="presentation" on
 *                  layout tables, alt text on every image, text contrast of
 *                  at least 4.5:1 (the clinic's colour is darkened until a
 *                  white label on it passes), underlined links.
 *   Plain text     every message has a text part made from the same blocks.
 *   Clinic brand   the clinic's logo (when it uploaded one) and its colour
 *                  (profile.brandColor) as the accent; DentVideo's teal else.
 *
 * Pure: no I/O, no environment.
 */

export type Brand = {
  /** The clinic's name, shown as the logo's alt text. */
  name?: string;
  /** An https URL of the clinic's logo; only https is used. */
  logoUrl?: string | null;
  /** The clinic's colour, "#RRGGBB" or "RRGGBB". */
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
  | { kind: "code"; code: string }
  | { kind: "stats"; items: { value: string; label: string }[] }
  | { kind: "thumbs"; items: Thumb[] }
  | { kind: "videos"; heading?: string; items: VideoRow[] };

export type EmailSpec = {
  lang: string;
  subject: string;
  /** The line inbox lists show after the subject. */
  preheader: string;
  /** Optional big line at the top of the card. */
  title?: string;
  hello?: string;
  blocks: Block[];
  /** The one action. */
  button?: { label: string; url: string };
  /** A second, quieter way: "<ask> <label>" with the label as a link. */
  secondary?: { ask: string; label: string; url: string };
  /** Small text under the button (e.g. "Nothing is published until you approve it"). */
  afterButton?: string[];
  signoff?: string;
  /** Why they get this email. */
  footer: string;
  /** Postal address line (marketing mail). */
  address?: string;
  unsubscribe?: { ask: string; label: string; url: string };
  brand?: Brand;
};

export type Rendered = { subject: string; html: string; text: string };

export const CONTACT_EMAIL = "hello@dentvideo.com";

export const COLORS = {
  paper: "#f4f1ec",
  card: "#ffffff",
  ink: "#14211f",
  body: "#2c3a37",
  muted: "#5b6a67",
  line: "#e6dfd3",
  panel: "#f7f4ef",
  teal: "#0f5c5c",
} as const;

const DARK = { paper: "#0e1514", card: "#17211f", ink: "#eef3f2", body: "#d5dedc", muted: "#a7b5b2", line: "#2b3735", panel: "#1f2b29", link: "#8fd3cb" };

export const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,'Hiragino Sans','Yu Gothic','Noto Sans Arabic','Noto Sans JP',sans-serif";

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

const hex = (c: [number, number, number]) => `#${c.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")}`;

/**
 * The accent for buttons and links: the clinic's colour, darkened step by
 * step until white text on it (and it as text on white) reaches 4.5:1. An
 * invalid or missing colour gives DentVideo's teal.
 */
export function accentColor(color: string | null | undefined): string {
  const c = color ? rgb(color) : null;
  if (!c) return COLORS.teal;
  let cur: [number, number, number] = c;
  for (let i = 0; i < 40 && contrast(hex(cur), "#ffffff") < 4.5; i++) cur = [cur[0] * 0.92, cur[1] * 0.92, cur[2] * 0.92];
  return hex(cur);
}

/* ------------------------------------------------------------------ helpers */

/** Escaped text with the contact address made a mailto link (kept LTR). */
function rich(s: string, link: string): string {
  const e = esc(s);
  const addr = esc(CONTACT_EMAIL);
  return e.split(addr).join(`<a href="mailto:${addr}" dir="ltr" class="dv-link" style="color:${link};text-decoration:underline">${addr}</a>`);
}

const safeUrl = (u: string | null | undefined) => (u && /^https:\/\//i.test(u) ? u : null);

/** Inbox preview text, padded so the body does not leak into the preview line. */
function preheader(s: string): string {
  return `<div class="dv-pre" aria-hidden="true" style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all">${esc(s)}${"&#847;&zwnj;&nbsp;".repeat(40)}</div>`;
}

const STYLE = `<style>
:root{color-scheme:light dark;supported-color-schemes:light dark}
body{margin:0!important;padding:0!important;width:100%!important}
a{text-decoration:underline}
@media (max-width:600px){
.dv-card{padding:28px 20px!important}
.dv-outer{padding:16px 8px!important}
.dv-btn,.dv-btn a{display:block!important;width:100%!important;box-sizing:border-box;text-align:center!important}
.dv-thumb{display:inline-block!important;width:50%!important}
.dv-h1{font-size:22px!important;line-height:29px!important}
}
@media (prefers-color-scheme:dark){
.dv-bg{background:${DARK.paper}!important}
.dv-card{background:${DARK.card}!important;border-color:${DARK.line}!important}
.dv-ink{color:${DARK.ink}!important}
.dv-body{color:${DARK.body}!important}
.dv-muted{color:${DARK.muted}!important}
.dv-panel{background:${DARK.panel}!important}
.dv-link{color:${DARK.link}!important}
.dv-mark{color:${DARK.link}!important}
.dv-logo{background:#ffffff!important;border-radius:8px}
}
[data-ogsc] .dv-bg{background:${DARK.paper}!important}
[data-ogsc] .dv-card{background:${DARK.card}!important}
[data-ogsc] .dv-ink{color:${DARK.ink}!important}
[data-ogsc] .dv-body{color:${DARK.body}!important}
[data-ogsc] .dv-muted{color:${DARK.muted}!important}
[data-ogsc] .dv-panel{background:${DARK.panel}!important}
[data-ogsc] .dv-link{color:${DARK.link}!important}
</style>`;

/* ------------------------------------------------------------------ blocks */

function blockHtml(b: Block, ctx: { accent: string; rtl: boolean; align: string }): string {
  const { accent, rtl, align } = ctx;
  const P = `margin:0 0 16px;font-size:16px;line-height:25px;color:${COLORS.body}`;
  switch (b.kind) {
    case "p":
      return b.muted
        ? `<p class="dv-muted" style="margin:0 0 16px;font-size:14px;line-height:21px;color:${COLORS.muted}">${rich(b.text, accent)}</p>`
        : `<p class="dv-body" style="${P}">${rich(b.text, accent)}</p>`;
    case "list":
      return (
        `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 16px">` +
        b.items
          .map(
            (it) =>
              `<tr><td width="22" valign="top" class="dv-mark" style="padding:2px 0;font-size:16px;line-height:25px;color:${accent};font-weight:700">&#8226;</td>` +
              `<td class="dv-body" style="padding:2px 0;font-size:16px;line-height:25px;color:${COLORS.body};text-align:${align}">${rich(it, accent)}</td></tr>`,
          )
          .join("") +
        `</table>`
      );
    case "steps":
      return (
        `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0 8px">` +
        b.items
          .map(
            (s, i) =>
              `<tr><td width="40" valign="top" style="padding:0 0 18px"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td width="28" height="28" align="center" valign="middle" bgcolor="${accent}" style="width:28px;height:28px;border-radius:14px;background:${accent};color:#ffffff;font-size:14px;font-weight:700;line-height:28px;text-align:center">${i + 1}</td></tr></table></td>` +
              `<td valign="top" style="padding:2px 0 18px;text-align:${align}"><p class="dv-ink" style="margin:0 0 2px;font-size:16px;line-height:24px;font-weight:600;color:${COLORS.ink}">${esc(s.title)}</p><p class="dv-body" style="margin:0;font-size:15px;line-height:23px;color:${COLORS.body}">${rich(s.body, accent)}</p></td></tr>`,
          )
          .join("") +
        `</table>`
      );
    case "panel":
      return (
        `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 16px"><tr>` +
        `<td class="dv-panel" bgcolor="${COLORS.panel}" style="background:${COLORS.panel};border-radius:12px;border-${rtl ? "right" : "left"}:4px solid ${accent};padding:14px 16px;font-size:15px;line-height:23px;text-align:${align}"><span class="dv-body" style="color:${COLORS.body}">${rich(b.text, accent)}</span></td></tr></table>`
      );
    case "qa":
      return b.items
        .map(
          (x) =>
            `<p class="dv-ink" style="margin:0 0 4px;font-size:16px;line-height:24px;font-weight:600;color:${COLORS.ink}">${esc(x.q)}</p>` +
            `<p class="dv-body" style="margin:0 0 18px;font-size:15px;line-height:23px;color:${COLORS.body}">${rich(x.a, accent)}</p>`,
        )
        .join("");
    case "code":
      return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 20px"><tr><td align="center" class="dv-panel" bgcolor="${COLORS.panel}" style="background:${COLORS.panel};border-radius:12px;padding:18px 12px"><span dir="ltr" class="dv-mark" style="font-family:'SF Mono',Menlo,Consolas,'Liberation Mono',monospace;font-size:34px;line-height:40px;font-weight:700;letter-spacing:8px;color:${accent}">${esc(b.code)}</span></td></tr></table>`;
    case "stats":
      return (
        `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 20px"><tr>` +
        b.items
          .map(
            (s) =>
              `<td align="center" valign="top" class="dv-panel" bgcolor="${COLORS.panel}" width="${Math.floor(100 / b.items.length)}%" style="background:${COLORS.panel};border-radius:12px;padding:14px 6px;border:4px solid transparent"><p class="dv-mark" style="margin:0;font-size:28px;line-height:34px;font-weight:700;color:${accent}">${esc(s.value)}</p><p class="dv-muted" style="margin:2px 0 0;font-size:13px;line-height:18px;color:${COLORS.muted}">${esc(s.label)}</p></td>`,
          )
          .join("") +
        `</tr></table>`
      );
    case "videos":
      return (
        (b.heading ? `<p class="dv-ink" style="margin:4px 0 10px;font-size:16px;line-height:24px;font-weight:700;color:${COLORS.ink}">${esc(b.heading)}</p>` : "") +
        `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 14px">` +
        b.items
          .map((v) => {
            const img = v.thumbUrl && /^https:\/\//.test(v.thumbUrl)
              ? `<a href="${esc(v.href)}" style="text-decoration:none"><img src="${esc(v.thumbUrl)}" alt="" width="72" style="display:block;width:72px;height:128px;border-radius:8px;border:0;object-fit:cover;background:${COLORS.panel}"></a>`
              : `<div class="dv-panel" style="width:72px;height:128px;border-radius:8px;background:${COLORS.panel}"></div>`;
            const pad = rtl ? "padding:0 14px 0 0" : "padding:0 0 0 14px";
            return (
              `<tr><td style="padding:0 0 14px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>` +
              `<td width="72" valign="top">${img}</td>` +
              `<td valign="top" style="${pad};text-align:${align}">` +
              `<p class="dv-ink" style="margin:0 0 4px;font-size:15px;line-height:21px;font-weight:700;color:${COLORS.ink}">${esc(v.title)}</p>` +
              (v.slot ? `<p class="dv-muted" style="margin:0 0 4px;font-size:13px;line-height:18px;color:${COLORS.muted}">${esc(v.slot)}</p>` : "") +
              (v.caption ? `<p class="dv-body" dir="auto" style="margin:0 0 8px;font-size:13px;line-height:19px;color:${COLORS.body}">${esc(v.caption)}</p>` : "") +
              `<a href="${esc(v.href)}" class="dv-link" style="display:inline-block;padding:8px 14px;border-radius:8px;background:${accent};color:#ffffff;font-size:14px;line-height:18px;font-weight:600;text-decoration:none">${esc(v.action)}</a>` +
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
      return `✓ ${b.text}`;
    case "qa":
      return b.items.map((x) => `${x.q}\n${x.a}`).join("\n\n");
    case "code":
      return b.code;
    case "stats":
      return b.items.map((s) => `${s.value} — ${s.label}`).join("\n");
    case "thumbs":
      return b.items.map((t) => `• ${t.title}`).join("\n");
    case "videos":
      return [b.heading ?? "", ...b.items.map((v) => [`• ${v.title}${v.slot ? ` (${v.slot})` : ""}`, v.caption ? `  ${v.caption}` : "", `  ${v.action}: ${v.href}`].filter(Boolean).join("\n"))].filter(Boolean).join("\n\n");
  }
}

/* ------------------------------------------------------------------ render */

export function renderEmail(s: EmailSpec): Rendered {
  const rtl = s.lang === "ar";
  const dir = rtl ? "rtl" : "ltr";
  const align = rtl ? "right" : "left";
  const accent = accentColor(s.brand?.color);
  const logo = safeUrl(s.brand?.logoUrl);
  const ctx = { accent, rtl, align };

  const logoRow = logo
    ? `<tr><td style="padding:0 0 20px;text-align:${align}"><img class="dv-logo" src="${esc(logo)}" alt="${esc(s.brand?.name || "")}" height="44" style="display:inline-block;height:44px;max-height:44px;width:auto;max-width:180px;border:0"></td></tr>`
    : "";
  const button = s.button
    ? `<table role="presentation" class="dv-btn" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 0"><tr><td class="dv-btn" bgcolor="${accent}" style="border-radius:10px;background:${accent};text-align:center"><a href="${esc(s.button.url)}" style="display:inline-block;min-width:200px;padding:15px 28px;font-family:${FONT};font-size:17px;font-weight:600;line-height:20px;color:#ffffff;text-decoration:none;border-radius:10px;mso-padding-alt:0">${esc(s.button.label)}</a></td></tr></table>` +
      `<p class="dv-muted" style="margin:14px 0 0;font-size:12px;line-height:18px;color:${COLORS.muted};word-break:break-all;text-align:${align}"><a href="${esc(s.button.url)}" dir="ltr" class="dv-link" style="color:${accent}">${esc(s.button.url)}</a></p>`
    : "";
  const second = s.secondary
    ? `<p class="dv-body" style="margin:18px 0 0;font-size:15px;line-height:23px;color:${COLORS.body}">${esc(s.secondary.ask)} <a href="${esc(s.secondary.url)}" class="dv-link" style="color:${accent};font-weight:600;text-decoration:underline">${esc(s.secondary.label)}</a></p>`
    : "";
  const after = (s.afterButton ?? []).map((t) => `<p class="dv-muted" style="margin:16px 0 0;font-size:14px;line-height:21px;color:${COLORS.muted}">${rich(t, accent)}</p>`).join("");
  const unsub = s.unsubscribe
    ? `<br>${esc(s.unsubscribe.ask)} <a href="${esc(s.unsubscribe.url)}" class="dv-muted" style="color:${COLORS.muted};text-decoration:underline">${esc(s.unsubscribe.label)}</a>`
    : "";
  const address = s.address ? `<br><span dir="ltr">DentVideo · ${esc(s.address)}</span>` : "";

  const html = `<!doctype html>
<html lang="${esc(s.lang)}" dir="${dir}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="X-UA-Compatible" content="IE=edge"><meta name="x-apple-disable-message-reformatting"><meta name="format-detection" content="telephone=no,date=no,address=no,email=no"><meta name="color-scheme" content="light dark"><meta name="supported-color-schemes" content="light dark"><title>${esc(s.subject)}</title>${STYLE}</head>
<body dir="${dir}" class="dv-bg" style="margin:0;padding:0;background:${COLORS.paper};font-family:${FONT};color:${COLORS.ink};-webkit-text-size-adjust:100%;text-align:${align}">
${preheader(s.preheader)}
<table role="presentation" class="dv-bg" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${COLORS.paper}" style="background:${COLORS.paper}"><tr><td align="center" class="dv-outer" style="padding:32px 16px">
<table role="presentation" dir="${dir}" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;text-align:${align}">
<tr><td style="padding:0 6px 14px;font-family:${FONT};font-size:19px;font-weight:700;letter-spacing:-0.2px;text-align:${align}"><span dir="ltr" class="dv-ink" style="color:${COLORS.ink}">Dent<span class="dv-mark" style="color:${COLORS.teal}">Video</span></span></td></tr>
<tr><td class="dv-card" bgcolor="${COLORS.card}" style="background:${COLORS.card};border:1px solid ${COLORS.line};border-top:4px solid ${accent};border-radius:16px;padding:32px 30px;font-family:${FONT};text-align:${align}">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${logoRow}<tr><td style="text-align:${align}">
${s.title ? `<h1 class="dv-ink dv-h1" style="margin:0 0 16px;font-size:24px;line-height:31px;font-weight:700;letter-spacing:-0.3px;color:${COLORS.ink}">${esc(s.title)}</h1>` : ""}
${s.hello ? `<p class="dv-body" style="margin:0 0 16px;font-size:16px;line-height:25px;color:${COLORS.body}">${esc(s.hello)}</p>` : ""}
${s.blocks.map((b) => blockHtml(b, ctx)).join("\n")}
${button}
${second}
${after}
${s.signoff ? `<p class="dv-body" style="margin:24px 0 0;font-size:16px;line-height:24px;color:${COLORS.body}">${esc(s.signoff)}</p>` : ""}
</td></tr></table>
</td></tr>
<tr><td class="dv-muted" style="padding:18px 6px 0;font-size:12px;line-height:18px;color:${COLORS.muted};text-align:${align}">${esc(s.footer)}${unsub}${address}</td></tr>
</table>
</td></tr></table></body></html>`;

  const text = [
    s.title,
    s.hello,
    ...s.blocks.map(blockText),
    s.button ? `${s.button.label}: ${s.button.url}` : undefined,
    s.secondary ? `${s.secondary.ask} ${s.secondary.label}: ${s.secondary.url}` : undefined,
    ...(s.afterButton ?? []),
    s.signoff,
    ["—", s.footer, s.unsubscribe ? `${s.unsubscribe.ask} ${s.unsubscribe.label}: ${s.unsubscribe.url}` : "", s.address ? `DentVideo · ${s.address}` : ""].filter(Boolean).join("\n"),
  ]
    .filter((p): p is string => typeof p === "string" && p.trim() !== "")
    .join("\n\n");

  return { subject: s.subject, html, text };
}
