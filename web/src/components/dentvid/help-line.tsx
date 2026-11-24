import { HELP_PATH, type Locale } from "@/content/dentvideo-locales";
import { HELP_LINE_EMAIL, helpLineMailto, helpLineText } from "@/content/dentvideo-help-line";
import { dvHref } from "@/lib/dentvid/host";

/**
 * The quiet line under an error where a failure costs the most (sign-up, the clinic step,
 * checkout, billing, account deletion): who to write to and where the help center is, in the
 * clinic's language (content/dentvideo-help-line.ts). The address opens a mail with a subject and
 * a short reference (`code`, e.g. "checkout-502") filled in, and the message the screen showed.
 * The help center opens in a new tab, so a half-filled form is not lost.
 */
export function HelpLine({ locale, code, message, className = "mt-2" }: { locale: Locale; code: string; message?: string | null; className?: string }) {
  const t = helpLineText(locale);
  const link = "font-medium text-dv-teal underline underline-offset-2 hover:no-underline";
  return (
    <p className={`${className} text-sm leading-relaxed text-dv-muted`} data-help-line={code}>
      {t.line.split(/(\{email\}|\{help\})/).map((part, i) =>
        part === "{email}" ? (
          <a key={i} href={helpLineMailto(locale, code, message)} className={link}>
            <span dir="ltr">{HELP_LINE_EMAIL}</span>
          </a>
        ) : part === "{help}" ? (
          <a key={i} href={dvHref(HELP_PATH[locale])} target="_blank" rel="noopener" className={link}>
            {t.help}
          </a>
        ) : (
          part
        ),
      )}
    </p>
  );
}
