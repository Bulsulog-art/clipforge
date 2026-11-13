import { AUTH_COPY, authText } from "@/content/dentvideo-auth";
import { renderEmail, type Rendered } from "./email-layout";

/**
 * The "choose a new password" email, in the clinic's language, in the shared
 * template (email-layout.ts). Transactional: no unsubscribe link.
 */
export function resetEmail(args: { language: string; link: string }): Rendered {
  const lang = Object.hasOwn(AUTH_COPY, args.language) ? args.language : "en";
  const c = authText(lang).email;
  return renderEmail({
    lang,
    subject: c.subject,
    preheader: c.body,
    title: c.subject,
    hello: c.hello,
    blocks: [{ kind: "p", text: c.body }],
    button: { label: c.button, url: args.link },
    afterButton: [c.ignore],
    footer: c.footer,
  });
}
