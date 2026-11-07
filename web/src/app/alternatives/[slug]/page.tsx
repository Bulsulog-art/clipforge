import { notFound } from "next/navigation";
import { SEO_PAGES, findSeoPage } from "@/content/seo-pages";
import { SeoLanding, seoMetadata } from "@/components/seo/seo-landing";

const SECTION = "alternatives";

export const dynamicParams = false;

export function generateStaticParams() {
  return SEO_PAGES.filter((p) => p.section === SECTION).map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const page = findSeoPage(SECTION, (await params).slug);
  return page ? seoMetadata(page) : {};
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const page = findSeoPage(SECTION, (await params).slug);
  if (!page) notFound();
  return <SeoLanding page={page} />;
}
