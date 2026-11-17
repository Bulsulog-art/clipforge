import { LifeBuoy, Mail } from "lucide-react";
import { dirOf, type Locale } from "@/content/dentvideo-locales";
import { fillSupport, helpMailto, supportText, SUPPORT_EMAIL } from "@/content/dentvideo-support";
import { HELP_LINK_TEXT, helpHref } from "@/content/dentvideo-help-links";
import { dvHref } from "@/lib/dentvid/host";

/**
 * "Help & contact": one small, self-contained card. A mailto to
 * hello@dentvideo.com (a real, monitored mailbox) with the subject and a
 * short body frame prefilled in the clinic's language, carrying the clinic's
 * name and id so support finds the account without asking. The address is
 * also written out for clinics whose device has no mail app set up.
 *
 * No state, no client JS: it renders the same on the server, in the dev
 * harness and in tests. Placed at the end of Settings (id="help", so the app
 * footer and support replies can link to /app/settings#help).
 */
export function HelpContact({ locale, clinicId, clinicName }: { locale: Locale; clinicId?: string | null; clinicName?: string | null }) {
  const t = supportText(locale).copy.help;
  const browse = HELP_LINK_TEXT[locale];
  const [before, after] = fillSupport(t.orWrite, { email: "\u0000" }).split("\u0000");
  return (
    <section id="help" aria-labelledby="help-title" lang={locale} dir={dirOf(locale)} className="mt-14 border-t border-dv-line pt-10">
      <div className="dv-card flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="max-w-xl">
          <h2 id="help-title" className="flex items-center gap-2 font-semibold text-dv-ink">
            <LifeBuoy className="h-4 w-4 shrink-0 text-dv-teal" aria-hidden="true" />
            {t.title}
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-dv-body">{t.lead}</p>
          <p className="mt-2 text-sm leading-relaxed text-dv-body">
            {browse.browse}{" "}
            <a href={dvHref(helpHref(locale))} target="_blank" rel="noopener" className="font-medium text-dv-teal underline-offset-4 hover:underline" data-testid="dv-help-center">
              {browse.center}
            </a>
            {/[:：]$/.test(browse.browse) ? "" : "."}
          </p>
          <p className="mt-2 text-sm text-dv-muted">
            {before}
            <a dir="ltr" href={`mailto:${SUPPORT_EMAIL}`} className="font-medium text-dv-teal underline-offset-4 hover:underline">
              {SUPPORT_EMAIL}
            </a>
            {after}
          </p>
        </div>
        <a href={helpMailto(locale, { id: clinicId, name: clinicName })} className="dv-btn dv-btn-secondary shrink-0 px-5 py-2.5 text-sm !text-dv-teal" data-testid="dv-help-mailto">
          <Mail className="h-4 w-4" aria-hidden="true" />
          {t.button}
        </a>
      </div>
    </section>
  );
}
