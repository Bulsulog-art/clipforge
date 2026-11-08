import type { MetadataRoute } from "next";
import { SEO_PAGES } from "@/content/seo-pages";
import { absoluteUrl } from "@/lib/site";
import { dentvideoPaths } from "@/lib/dentvid/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: absoluteUrl("/"), changeFrequency: "weekly", priority: 1 },
    { url: absoluteUrl("/pricing"), changeFrequency: "monthly", priority: 0.9 },
    { url: absoluteUrl("/free-clip-maker"), changeFrequency: "monthly", priority: 0.8 },
    { url: absoluteUrl("/use-cases"), changeFrequency: "monthly", priority: 0.7 },
    { url: absoluteUrl("/alternatives"), changeFrequency: "monthly", priority: 0.7 },
    ...SEO_PAGES.map((p) => ({
      url: absoluteUrl(`/${p.section}/${p.slug}`),
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
    ...dentvideoPaths().map((path) => ({
      url: absoluteUrl(path),
      changeFrequency: "monthly" as const,
      priority: path === "/dentvideo" ? 0.9 : 0.7,
    })),
    { url: absoluteUrl("/signup"), changeFrequency: "yearly", priority: 0.5 },
    { url: absoluteUrl("/support"), changeFrequency: "yearly", priority: 0.3 },
    { url: absoluteUrl("/legal/privacy"), changeFrequency: "yearly", priority: 0.2 },
    { url: absoluteUrl("/legal/terms"), changeFrequency: "yearly", priority: 0.2 },
  ];
}
