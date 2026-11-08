import Link from "next/link";
import { dateLocale } from "@/lib/dentvid/app-ui";
import { ArrowRight, ChevronRight } from "lucide-react";
import { LANDING_PATH, type Locale } from "@/content/dentvideo";
import { parseInline, resolveTarget } from "@/content/guides/text";
import { GUIDE_UI } from "@/content/guides/ui";
import { dvHref } from "@/lib/dentvid/host";
import { DvIcon } from "./mark";

/** Guide text with its inline links: internal ones as app links, sources in a new tab. */
export function RichText({ text, locale }: { text: string; locale: Locale }) {
  return (
    <>
      {parseInline(text).map((part, i) => {
        if (part.kind === "text") return part.text;
        const href = resolveTarget(part.target, locale);
        if (!href) return part.label;
        const cls = "font-medium text-dv-teal underline decoration-dv-teal/30 underline-offset-[3px] transition-colors hover:decoration-dv-teal";
        return /^https?:/.test(href) ? (
          <a key={i} href={href} target="_blank" rel="noopener noreferrer" className={cls}>
            {part.label}
          </a>
        ) : (
          <Link key={i} href={dvHref(href)} className={cls}>
            {part.label}
          </Link>
        );
      })}
    </>
  );
}

export function Breadcrumbs({ items }: { items: { name: string; href?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-1.5 text-sm text-dv-muted">
        {items.map((it, i) => (
          <li key={i} className="flex items-center gap-1.5">
            {i > 0 && <ChevronRight className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />}
            {it.href ? (
              <Link href={dvHref(it.href)} className="-my-0.5 inline-block rounded-md py-0.5 font-medium text-dv-teal underline-offset-4 hover:underline">
                {it.name}
              </Link>
            ) : (
              <span aria-current="page" className="line-clamp-1">{it.name}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

/** The DentVideo call to action at the end of guides, indexes and the About page. */
export function GuideCta({ locale }: { locale: Locale }) {
  const t = GUIDE_UI[locale].cta;
  return (
    <section className="dv-on-dark dv-grain relative isolate overflow-hidden rounded-[1.5rem] bg-dv-teal-900 p-7 text-[#f7f1e7] sm:p-10">
      <div aria-hidden="true" className="absolute -right-24 -top-24 -z-10 h-72 w-72 rounded-full bg-[#167269] opacity-70 blur-3xl" />
      <DvIcon tone="dark" className="h-11 w-11" />
      <p className="dv-display mt-6 text-balance text-[1.875rem] leading-[1.1] text-white sm:text-[2.25rem]">{t.title}</p>
      <p className="mt-3 max-w-xl leading-relaxed text-[#cfe2df]">{t.text}</p>
      <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-4">
        <Link href={dvHref(`/dentvideo/start?lang=${locale}`)} className="dv-btn dv-btn-light group px-6 py-3.5">
          {t.button}
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
        </Link>
        <Link href={dvHref(`${LANDING_PATH[locale]}#how`)} className="rounded-md font-semibold text-[#8fd1c6] underline-offset-4 hover:underline">
          {t.more}
        </Link>
      </div>
    </section>
  );
}

/**
 * Gives <html> this page's language before first paint. The root layout is
 * shared with ClipForge and renders lang="en", which told screen readers and
 * search engines that the German, Spanish, Turkish and French pages were
 * English. The header keeps it in step on client-side navigation.
 */
export function HtmlLang({ locale }: { locale: Locale }) {
  return <script dangerouslySetInnerHTML={{ __html: `document.documentElement.lang=${JSON.stringify(locale)}` }} />;
}

/** "8 November 2026" in the page's language. */
export function formatDate(iso: string, locale: Locale): string {
  return new Intl.DateTimeFormat(dateLocale(locale), { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${iso}T00:00:00Z`));
}
