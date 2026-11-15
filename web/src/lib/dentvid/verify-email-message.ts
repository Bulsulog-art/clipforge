import { fmtAuth, verifyText, VERIFY_COPY } from "@/content/dentvideo-auth";
import { renderEmail, type Rendered } from "./email-layout";

/**
 * The "here is your 6-digit code" email, in the visitor's language, in the
 * shared template (email-layout.ts). The code stays left to right in Arabic.
 */
export function codeEmail(args: { language: string; code: string }): Rendered {
  const lang = Object.hasOwn(VERIFY_COPY, args.language) ? args.language : "en";
  const c = verifyText(lang).email;
  const subject = fmtAuth(c.subject, { code: args.code });
  const spaced = `${args.code.slice(0, 3)} ${args.code.slice(3)}`;
  return renderEmail({
    lang,
    subject,
    // Not the body: in German and Polish it continues the greeting in lower case.
    preheader: `${c.expires} ${c.ignore}`,
    title: c.title,
    hello: c.hello,
    blocks: [
      { kind: "p", text: c.body },
      { kind: "code", code: spaced },
      { kind: "p", text: c.expires, muted: true },
      { kind: "p", text: c.ignore, muted: true },
    ],
    footer: c.footer,
  });
}
