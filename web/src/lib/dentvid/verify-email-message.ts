import { fmtAuth, verifyText, VERIFY_COPY } from "@/content/dentvideo-auth";

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/**
 * The "here is your 6-digit code" email, in the visitor's language. Arabic
 * flips the whole message; the brand and the code itself stay left to right.
 */
export function codeEmail(args: { language: string; code: string }): { subject: string; html: string; text: string } {
  const lang = Object.hasOwn(VERIFY_COPY, args.language) ? args.language : "en";
  const c = verifyText(lang).email;
  const subject = fmtAuth(c.subject, { code: args.code });
  const spaced = `${args.code.slice(0, 3)} ${args.code.slice(3)}`;
  const text = [c.hello, "", c.body, "", spaced, "", c.expires, "", c.ignore, "", "—", c.footer].join("\n");
  const rtl = lang === "ar";
  const dir = rtl ? "rtl" : "ltr";
  const align = rtl ? "right" : "left";
  const font = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
  const html = `<!doctype html>
<html lang="${lang}" dir="${dir}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light"><title>${esc(subject)}</title></head>
<body dir="${dir}" style="margin:0;padding:0;background:#faf7f2;font-family:${font};color:#14211f;-webkit-text-size-adjust:100%;text-align:${align}">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:#faf7f2">${esc(c.body)} ${esc(c.expires)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#faf7f2"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" dir="${dir}" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;text-align:${align}">
<tr><td style="padding:0 4px 16px;font-family:${font};font-size:20px;font-weight:700;letter-spacing:-0.2px;color:#14211f;text-align:${align}"><span dir="ltr">Dent<span style="color:#0f5c5c">Video</span></span></td></tr>
<tr><td style="background:#ffffff;border:1px solid #e8e1d5;border-radius:16px;padding:32px 28px">
<p style="margin:0 0 12px;font-size:16px;line-height:24px">${esc(c.hello)}</p>
<p style="margin:0 0 20px;font-size:16px;line-height:24px">${esc(c.body)}</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 20px"><tr><td align="center" bgcolor="#faf7f2" style="background:#faf7f2;border-radius:12px;padding:18px 12px">
<span dir="ltr" style="font-family:'SF Mono',Menlo,Consolas,'Liberation Mono',monospace;font-size:34px;line-height:40px;font-weight:700;letter-spacing:8px;color:#0f5c5c">${esc(spaced)}</span>
</td></tr></table>
<p style="margin:0 0 12px;font-size:14px;line-height:21px;color:#3d4c49">${esc(c.expires)}</p>
<p style="margin:0;font-size:14px;line-height:21px;color:#3d4c49">${esc(c.ignore)}</p>
</td></tr>
<tr><td style="padding:16px 4px 0;font-size:12px;line-height:18px;color:#5b6a67">${esc(c.footer)}</td></tr>
</table>
</td></tr></table></body></html>`;
  return { subject, html, text };
}
