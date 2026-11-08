import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { LANDING_PATH, guidePath, guidesFor, type Guide, type Locale } from "@/content/dentvideo";
import type { GuideCategory } from "@/content/guides/types";
import { readingMinutes } from "@/content/guides/text";
import { ABOUT_PATH, GUIDE_UI } from "@/content/guides/ui";
import { ENTITY } from "@/content/guides/entity";
import { guidesIndexJsonLd } from "@/lib/dentvid/seo-guides";
import { dvHref } from "@/lib/dentvid/host";
import { Breadcrumbs, GuideCta } from "./guide-parts";

const ORDER: GuideCategory[] = ["ideas", "video", "rules", "tools"];

/** The guides hub for one language: every guide, grouped by what it helps with. */
export function GuidesIndex({ locale }: { locale: Locale }) {
  const ui = GUIDE_UI[locale];
  const guides = guidesFor(locale);
  const groups = ORDER.map((c) => ({ c, items: guides.filter((g) => (g.category ?? "ideas") === c) })).filter((x) => x.items.length > 0);

  return (
    <main lang={locale}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(guidesIndexJsonLd(locale)) }} />
      <header className="relative isolate overflow-hidden border-b border-dv-line">
        <div aria-hidden="true" className="dv-grid absolute inset-0 -z-10" />
        <div aria-hidden="true" className="absolute -left-40 -top-24 -z-10 h-96 w-96 rounded-full bg-[#cfe6e0] opacity-60 blur-3xl" />
        <div className="mx-auto max-w-6xl px-4 pb-12 pt-8 sm:px-6 sm:pb-16 sm:pt-14">
          <Breadcrumbs items={[{ name: "DentVideo", href: LANDING_PATH[locale] }, { name: ui.breadcrumbGuides }]} />
          <h1 className="dv-display mt-6 max-w-3xl text-balance text-[2.75rem] leading-[1.02] text-dv-ink sm:text-[3.75rem]">{ui.index.h1}</h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-dv-body sm:text-xl">{ui.index.lead}</p>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
        {groups.map(({ c, items }) => (
          <section key={c} className="mt-14 sm:mt-16" aria-labelledby={`cat-${c}`}>
            <h2 id={`cat-${c}`} className="dv-display text-[2rem] leading-tight text-dv-ink sm:text-[2.5rem]">{ui.categories[c]}</h2>
            <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((g) => (
                <li key={g.slug}>
                  <GuideCard g={g} minutes={ui.readingTime(readingMinutes(g))} />
                </li>
              ))}
            </ul>
          </section>
        ))}

        <div className="mt-20">
          <GuideCta locale={locale} />
        </div>

        <p className="mt-10 max-w-3xl text-sm leading-relaxed text-dv-muted">
          {ENTITY[locale].definition}{" "}
          <Link href={dvHref(ABOUT_PATH[locale])} className="font-medium text-dv-teal underline-offset-4 hover:underline">
            {ui.about}
          </Link>
        </p>
      </div>
    </main>
  );
}

function GuideCard({ g, minutes }: { g: Guide; minutes: string }) {
  return (
    <Link
      href={dvHref(guidePath(g))}
      className="dv-card group flex h-full flex-col p-6 transition-shadow hover:shadow-[0_0_0_1px_rgba(15,92,92,0.35),0_18px_40px_-20px_rgba(15,92,92,0.35)]"
    >
      <span className="flex items-start justify-between gap-4">
        <span className="text-[1.125rem] font-semibold leading-snug text-dv-ink">{g.h1}</span>
        <ArrowUpRight className="mt-0.5 h-5 w-5 shrink-0 text-dv-teal transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden="true" />
      </span>
      <span className="mt-3 line-clamp-4 text-[0.9375rem] leading-relaxed text-dv-body">{g.description}</span>
      <span className="mt-auto pt-5 text-xs font-medium uppercase tracking-[0.12em] text-dv-muted">{minutes}</span>
    </Link>
  );
}
