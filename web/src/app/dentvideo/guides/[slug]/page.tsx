import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, ArrowUpRight, ChevronRight, Plus } from "lucide-react";
import { GUIDES, LANDING, LANDING_PATH, findGuide, guidePath, guidesFor } from "@/content/dentvideo";
import { guideJsonLd, guideMetadata } from "@/lib/dentvid/seo";
import { DvIcon } from "@/components/dentvid/mark";

export const dynamicParams = false;

export function generateStaticParams() {
  return GUIDES.map((g) => ({ slug: g.slug }));
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const g = findGuide((await params).slug);
  return g ? guideMetadata(g) : {};
}

export default async function GuidePage({ params }: Props) {
  const g = findGuide((await params).slug);
  if (!g) notFound();
  const c = LANDING[g.locale];
  const home = LANDING_PATH[g.locale];
  const related = guidesFor(g.locale).filter((o) => o.slug !== g.slug);

  return (
    <main lang={g.locale}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(guideJsonLd(g)) }} />

      <article>
      <header className="relative isolate overflow-hidden border-b border-dv-line">
        <div aria-hidden="true" className="dv-grid absolute inset-0 -z-10" />
        <div aria-hidden="true" className="absolute -right-40 -top-20 -z-10 h-96 w-96 rounded-full bg-[#cfe6e0] opacity-60 blur-3xl" />
        <div className="mx-auto max-w-3xl px-4 pb-14 pt-10 sm:px-6 sm:pb-20 sm:pt-16">
          <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 text-sm text-dv-muted">
            <Link href={home} className="rounded-md font-medium text-dv-teal underline-offset-4 hover:underline">DentVideo</Link>
            <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{c.guidesHeading}</span>
          </nav>
          <h1 className="dv-display mt-6 text-balancetext-[2.5rem] leading-[1.04] text-dv-ink sm:text-[3.5rem]">{g.h1}</h1>
          <p className="mt-6 text-lg leading-relaxed text-dv-body sm:text-xl">{g.intro}</p>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 pb-8 pt-4 sm:px-6">
        {g.sections.map((s) => (
          <section key={s.heading} className="mt-12 sm:mt-14">
            <h2 className="text-[1.5rem] font-semibold leading-snug tracking-tight text-dv-ink sm:text-[1.75rem]">{s.heading}</h2>
            {s.paragraphs.map((p, i) => (
              <p key={i} className="mt-4 text-[1.0625rem] leading-[1.75] text-[#33423f]">{p}</p>
            ))}
          </section>
        ))}

        <aside className="dv-on-dark dv-grain relative isolate mt-16 overflow-hidden rounded-[1.5rem] bg-dv-teal-900 p-7 text-[#f7f1e7] sm:p-10">
          <div aria-hidden="true" className="absolute -right-24 -top-24 -z-10 h-72 w-72 rounded-full bg-[#167269] opacity-70 blur-3xl" />
          <DvIcon tone="dark" className="h-11 w-11" />
          <p className="dv-display mt-6 text-[1.875rem] leading-[1.1] text-white sm:text-[2.25rem]">{c.hero.h1}</p>
          <p className="mt-3 max-w-xl leading-relaxed text-[#cfe2df]">{c.pricing.text}</p>
          <Link href={`/dentvideo/start?lang=${g.locale}`} className="dv-btn dv-btn-light group mt-7 px-6 py-3.5">
            {c.hero.cta}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
          </Link>
        </aside>

        <section className="mt-16">
          <h2 className="dv-display text-[2rem] leading-tight text-dv-ink sm:text-[2.5rem]">{c.faqHeading}</h2>
          <div className="mt-6 divide-y divide-dv-line border-y border-dv-line">
            {g.faq.map((f, i) => (
              <details key={f.q} className="group" open={i === 0}>
                <summary className="flex cursor-pointer items-start justify-between gap-6 py-5 text-left font-semibold leading-snug text-dv-ink">
                  {f.q}
                  <span aria-hidden="true" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-dv-teal ring-1 ring-dv-line transition-transform duration-300 group-open:rotate-45">
                    <Plus className="h-4 w-4" />
                  </span>
                </summary>
                <p className="-mt-1 pb-6 pr-12 leading-relaxed text-dv-body">{f.a}</p>
              </details>
            ))}
          </div>
        </section>
      </div>
      </article>

      <nav aria-label={c.guidesHeading} className="mx-auto max-w-3xl px-4 pb-24 pt-10 sm:px-6">
        <ul className="grid gap-3 sm:grid-cols-2">
          {related.map((o) => (
            <li key={o.slug}>
              <Link href={guidePath(o)} className="dv-card group flex h-full items-start justify-between gap-4 p-5 font-semibold leading-snug text-dv-ink">
                {o.h1}
                <ArrowUpRight className="mt-0.5 h-5 w-5 shrink-0 text-dv-teal transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden="true" />
              </Link>
            </li>
          ))}
          <li>
            <Link href={home} className="dv-card group flex h-full items-start justify-between gap-4 p-5 font-semibold leading-snug text-dv-teal">
              DentVideo — {c.hero.eyebrow}
              <ArrowUpRight className="mt-0.5 h-5 w-5 shrink-0 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden="true" />
            </Link>
          </li>
        </ul>
      </nav>
    </main>
  );
}
