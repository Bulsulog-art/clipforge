import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { GUIDES, LANDING, LANDING_PATH, findGuide, guidePath, guidesFor } from "@/content/dentvideo";
import { guideJsonLd, guideMetadata } from "@/lib/dentvid/seo";

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
    <main lang={g.locale} className="mx-auto max-w-3xl px-4 pb-24 pt-12 sm:px-6 sm:pt-16">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(guideJsonLd(g)) }} />

      <nav aria-label="Breadcrumb" className="text-sm text-[#6b7a77]">
        <Link href={home} className="underline-offset-4 hover:underline">DentVideo</Link>
        <span className="mx-2" aria-hidden="true">/</span>
        <span>{c.guidesHeading}</span>
      </nav>

      <article>
        <h1 className="mt-6 text-3xl font-semibold leading-tight tracking-tight sm:text-5xl">{g.h1}</h1>
        <p className="mt-6 text-lg text-[#4a5a57]">{g.intro}</p>

        {g.sections.map((s) => (
          <section key={s.heading} className="mt-12">
            <h2 className="text-2xl font-semibold tracking-tight">{s.heading}</h2>
            {s.paragraphs.map((p, i) => (
              <p key={i} className="mt-4 leading-relaxed text-[#33423f]">{p}</p>
            ))}
          </section>
        ))}

        <aside className="mt-14 rounded-2xl bg-[#0f5c5c] p-7 text-[#f5efe6] sm:p-9">
          <p className="text-xl font-semibold leading-snug">{c.hero.h1}</p>
          <p className="mt-2 text-[#cfe2df]">{c.pricing.text}</p>
          <Link href="/dentvideo/start" className="mt-6 inline-block rounded-full bg-[#f5efe6] px-6 py-3 font-medium text-[#0f5c5c] transition hover:bg-white">
            {c.hero.cta}
          </Link>
        </aside>

        <section className="mt-14">
          <h2 className="text-2xl font-semibold tracking-tight">{c.faqHeading}</h2>
          <dl className="mt-6 space-y-6">
            {g.faq.map((f) => (
              <div key={f.q} className="border-b border-[#e8e1d5] pb-6">
                <dt className="font-semibold">{f.q}</dt>
                <dd className="mt-2 text-[#4a5a57]">{f.a}</dd>
              </div>
            ))}
          </dl>
        </section>
      </article>

      <nav aria-label={c.guidesHeading} className="mt-14 border-t border-[#e8e1d5] pt-8">
        <ul className="space-y-3">
          {related.map((o) => (
            <li key={o.slug}>
              <Link href={guidePath(o)} className="font-medium text-[#0f5c5c] underline-offset-4 hover:underline">{o.h1}</Link>
            </li>
          ))}
          <li>
            <Link href={home} className="font-medium text-[#0f5c5c] underline-offset-4 hover:underline">DentVideo — {c.hero.eyebrow}</Link>
          </li>
        </ul>
      </nav>
    </main>
  );
}
