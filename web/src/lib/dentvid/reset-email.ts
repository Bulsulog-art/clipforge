import { authText } from "@/content/dentvideo-auth";

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** The "choose a new password" email, in the clinic's language. */
export function resetEmail(args: { language: string; link: string }): { subject: string; html: string; text: string } {
  const c = authText(args.language).email;
  const text = [c.hello, "", c.body, "", `${c.button}: ${args.link}`, "", c.ignore, "", "—", c.footer].join("\n");
  const html = `<!doctype html><html lang="${esc(args.language)}"><body style="margin:0;background:#faf7f2;font-family:Inter,Helvetica,Arial,sans-serif;color:#14211f">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" style="max-width:520px;background:#ffffff;border:1px solid #e8e1d5;border-radius:16px" cellpadding="0" cellspacing="0"><tr><td style="padding:32px">
<p style="margin:0 0 24px;font-weight:600;color:#0f5c5c;font-size:18px">DentVideo</p>
<p style="margin:0 0 12px;font-size:16px">${esc(c.hello)}</p>
<p style="margin:0 0 24px;font-size:16px;line-height:1.5">${esc(c.body)}</p>
<table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="border-radius:999px;background:#0f5c5c"><a href="${esc(args.link)}" style="display:inline-block;padding:14px 28px;color:#f5efe6;text-decoration:none;font-weight:600;border-radius:999px">${esc(c.button)}</a></td></tr></table>
<p style="margin:20px 0 0;font-size:13px;color:#4a5a57;word-break:break-all">${esc(args.link)}</p>
<p style="margin:20px 0 0;font-size:14px;color:#4a5a57">${esc(c.ignore)}</p>
</td></tr></table>
<p style="margin:16px 0 0;font-size:12px;color:#6b7a77">${esc(c.footer)}</p>
</td></tr></table></body></html>`;
  return { subject: c.subject, html, text };
}
