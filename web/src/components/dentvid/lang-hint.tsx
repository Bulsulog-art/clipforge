import { ArrowRight, X } from "lucide-react";
import { LANDING_PATH, dirOf } from "@/content/dentvideo-locales";
import { HINT_LOCALES, LANG_HINT_CLOSE, LANG_HINT_COPY } from "@/lib/dentvid/lang-hint";
import { dvHref } from "@/lib/dentvid/host";

/**
 * "This page is also in Turkish": one calm line at the top of the English
 * landing, in the visitor's own language, linking to that landing. Every
 * language's line is in the HTML, hidden; the head script picks at most one
 * before the first paint and handles the close button (lib/dentvid/lang-hint),
 * so it never shifts the page and adds nothing to the page's JavaScript.
 * No redirect, ever.
 */
export function LanguageHint() {
  return (
    <>
      {HINT_LOCALES.map((l) => {
        const c = LANG_HINT_COPY[l];
        return (
          <div key={l} data-l={l} lang={l} dir={dirOf(l)} className="dv-lang-hint border-b border-dv-line/70 bg-[#f4efe6]">
            <div className="mx-auto flex max-w-6xl items-center justify-center gap-1 px-4 sm:px-6">
              <a href={dvHref(LANDING_PATH[l])} hrefLang={l} className="dv-link inline-flex min-h-11 min-w-0 items-center gap-1.5 text-[0.9375rem] font-semibold">
                <span className="min-w-0">{c.line}</span>
                <ArrowRight className="h-4 w-4 shrink-0 rtl:-scale-x-100" aria-hidden="true" />
              </a>
              <button
                type="button"
                {...{ [LANG_HINT_CLOSE]: "" }}
                aria-label={c.close}
                title={c.close}
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-dv-muted transition hover:bg-black/5 hover:text-dv-ink">
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        );
      })}
    </>
  );
}
