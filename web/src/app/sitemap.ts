import type { MetadataRoute } from "next";

const BASE = "https://clipforge.bulsulabs.xyz";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: BASE, changeFrequency: "weekly", priority: 1 },
    { url: `${BASE}/free-clip-maker`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE}/signup`, changeFrequency: "yearly", priority: 0.6 },
    { url: `${BASE}/login`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE}/support`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE}/legal/privacy`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${BASE}/legal/terms`, changeFrequency: "yearly", priority: 0.2 },
  ];
}
