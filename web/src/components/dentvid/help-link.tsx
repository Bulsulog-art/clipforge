import { CircleHelp } from "lucide-react";
import type { Locale } from "@/content/dentvideo-locales";
import { HELP_LINK_TEXT, helpHref, type HelpId } from "@/content/dentvideo-help-links";
import { dvHref } from "@/lib/dentvid/host";

/**
 * A quiet "How this works" link from a spot in the app to the matching answer
 * in the help center (/help#<id>), in the clinic's language. It opens in a
 * new tab so a half-filled form or a playing video is not lost. No state:
 * safe in server and client components alike, and tiny in the bundle.
 */
export function HelpLink({ locale, id, label, className = "" }: { locale: Locale; id: HelpId; label?: string; className?: string }) {
  return (
    <a
      href={dvHref(helpHref(locale, id))}
      target="_blank"
      rel="noopener"
      className={`inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-dv-teal underline-offset-4 hover:underline lg:min-h-0 ${className}`}
      data-help-link={id}
    >
      <CircleHelp className="h-4 w-4 shrink-0" aria-hidden="true" />
      {label ?? HELP_LINK_TEXT[locale].more}
    </a>
  );
}
