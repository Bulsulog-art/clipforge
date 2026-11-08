import { AUTH_COPY, authText } from "@/content/dentvideo-auth";

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/**
 * The "choose a new password" email, in the clinic's language. Arabic flips
 * the whole message; the brand and the link stay left to right.
 */
export function resetEmail(args: { language: string; link: string }): { subject: string; html: string; text: string } {
  const lang = Object.hasOwn(AUTH_COPY, args.language) ? args.language : "en";
  const c = authText(lang).email;
  const text = [c.hello, "", c.body, "", `${c.button}: ${args.link}`, "", c.ignore, "", "—", c.footer].join("\n");
  const rtl = lang === "ar";
  const dir = rtl ? "rtl" : "ltr";
  const align = rtl ? "right" : "left";
  const html = `<!doctype html><html lang="${lang}" dir="${dir}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(c.subject)}</title></head><body dir="${dir}" style="margin:0;background:#faf7f2;font-family:Inter,Helvetica,Arial,sans-serif;color:#14211f;text-align:${align}">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" dir="${dir}" width="100%" style="max-width:520px;background:#ffffff;border:1px solid #e8e1d5;border-radius:16px;text-align:${align}" cellpadding="0" cellspacing="0"><tr><td style="padding:32px">
<p style="margin:0 0 24px;font-weight:600;color:#0f5c5c;font-size:18px"><span dir="ltr">DentVideo</span></p>
<p style="margin:0 0 12px;font-size:16px">${esc(c.hello)}</p>
<p style="margin:0 0 24px;font-size:16px;line-height:1.6">${esc(c.body)}</p>
<table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="border-radius:999px;background:#0f5c5c"><a href="${esc(args.link)}" style="display:inline-block;padding:14px 28px;color:#f5efe6;text-decoration:none;font-weight:600;border-radius:999px">${esc(c.button)}</a></td></tr></table>
<p dir="ltr" style="margin:20px 0 0;font-size:13px;color:#4a5a57;word-break:break-all;text-align:left">${esc(args.link)}</p>
<p style="margin:20px 0 0;font-size:14px;line-height:1.6;color:#4a5a57">${esc(c.ignore)}</p>
</td></tr></table>
<p style="margin:16px 0 0;font-size:12px;line-height:1.6;color:#6b7a77;max-width:520px;text-align:${align}">${esc(c.footer)}</p>
</td></tr></table></body></html>`;
  return { subject: c.subject, html, text };
}
