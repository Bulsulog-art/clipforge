import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, Check, Scissors } from "lucide-react";
import { SEO_PAGES, type SeoPage } from "@/content/seo-pages";
import { absoluteUrl, SITE_NAME } from "@/lib/site";

export function seoMetadata(page: SeoPage): Metadata {
  const url = absoluteUrl(`/${page.section}/${page.slug}`);
  return {
    title: page.title,
    description: page.description,
    alternates: { canonical: url },
    openGraph: { title: page.title, description: page.description, url, type: "article", siteName: SITE_NAME },
    twitter: { card: "summary_large_image", title: page.title, description: page.description },
  };
}

function jsonLd(page: SeoPage) {
  const url = absoluteUrl(`/${page.section}/${page.slug}`);
  const graph: Record<string, unknown>[] = [
    {
      "@type": "FAQPage",
      mainEntity: page.faqs.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: SITE_NAME, item: absoluteUrl("/") },
        {
          "@type": "ListItem",
          position: 2,
          name: page.section === "use-cases" ? "Use cases" : "Alternatives",
          item: absoluteUrl(`/${page.section}`),
        },
        { "@type": "ListItem", position: 3, name: page.h1, item: url },
      ],
    },
  ];
  if (page.steps) {
    graph.push({
      "@type": "HowTo",
      name: page.h1,
      step: page.steps.map((s, i) => ({ "@type": "HowToStep", position: i + 1, name: s.title, text: s.body })),
    });
  }
  return { "@context": "https://schema.org", "@graph": graph };
}

export function SeoNav() {
  return (
    <nav className="container flex items-center justify-between py-6">
      <Link href="/" className="flex items-center gap-2 text-lg font-semibold">
        <Scissors className="h-5 w-5 text-brand" aria-hidden="true" /> {SITE_NAME}
      </Link>
      <div className="flex items-center gap-4 text-sm">
        <Link href="/pricing" className="text-muted-foreground hover:text-foreground">
          Pricing
        </Link>
        <Link
          href="/signup"
          className="rounded-full bg-brand px-4 py-2 font-medium text-white transition hover:bg-brand-glow"
        >
          Start free
        </Link>
      </div>
    </nav>
  );
}

export function SeoLanding({ page }: { page: SeoPage }) {
  const related = SEO_PAGES.filter((p) => p.slug !== page.slug).slice(0, 6);
  return (
    <main className="min-h-screen gradient-bg">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd(page)) }} />
      <SeoNav />

      <article>
        <header className="container py-14 text-center">
          <h1 className="mx-auto max-w-3xl text-4xl font-bold tracking-tight md:text-5xl">{page.h1}</h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">{page.intro}</p>
          <div className="mt-8 flex justify-center">
            <Link
              href="/signup"
              className="group inline-flex items-center gap-2 rounded-full bg-brand px-6 py-3 text-base font-medium text-white shadow-lg shadow-brand/30 transition hover:bg-brand-glow"
            >
              Make your first clips free
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" aria-hidden="true" />
            </Link>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">No credit card · first clip set free</p>
        </header>

        <section className="container max-w-2xl pb-14">
          <ul className="grid gap-3 sm:grid-cols-2">
            {page.points.map((p) => (
              <li key={p} className="flex items-start gap-2 rounded-2xl border border-border bg-card p-4 text-sm shadow-sm">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand" aria-hidden="true" />
                <span>{p}</span>
              </li>
            ))}
          </ul>
        </section>

        {page.steps && (
          <section className="container max-w-2xl pb-14">
            <h2 className="text-2xl font-bold">How it works</h2>
            <ol className="mt-6 space-y-5">
              {page.steps.map((s, i) => (
                <li key={s.title} className="flex gap-4">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand/10 text-sm font-semibold text-brand">
                    {i + 1}
                  </span>
                  <div>
                    <h3 className="font-semibold">{s.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{s.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        )}

        {page.body.map((b) => (
          <section key={b.heading} className="container max-w-2xl pb-10">
            <h2 className="text-2xl font-bold">{b.heading}</h2>
            <p className="mt-3 text-muted-foreground">{b.text}</p>
          </section>
        ))}

        <section className="container max-w-2xl pb-14">
          <h2 className="text-2xl font-bold">Questions</h2>
          <dl className="mt-6 space-y-5">
            {page.faqs.map((f) => (
              <div key={f.q}>
                <dt className="font-semibold">{f.q}</dt>
                <dd className="mt-1 text-sm text-muted-foreground">{f.a}</dd>
              </div>
            ))}
          </dl>
        </section>
      </article>

      <section className="container max-w-2xl pb-20">
        <h2 className="text-lg font-semibold">More ways to use {SITE_NAME}</h2>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {related.map((r) => (
            <li key={r.slug}>
              <Link href={`/${r.section}/${r.slug}`} className="text-sm text-brand hover:underline">
                {r.h1}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}

export function SeoIndex({ section, title, intro }: { section: SeoPage["section"]; title: string; intro: string }) {
  const pages = SEO_PAGES.filter((p) => p.section === section);
  return (
    <main className="min-h-screen gradient-bg">
      <SeoNav />
      <section className="container max-w-2xl py-14">
        <h1 className="text-4xl font-bold tracking-tight">{title}</h1>
        <p className="mt-4 text-muted-foreground">{intro}</p>
        <ul className="mt-10 space-y-6">
          {pages.map((p) => (
            <li key={p.slug}>
              <Link href={`/${p.section}/${p.slug}`} className="text-lg font-semibold text-brand hover:underline">
                {p.h1}
              </Link>
              <p className="mt-1 text-sm text-muted-foreground">{p.description}</p>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
