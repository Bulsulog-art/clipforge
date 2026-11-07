import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/site";

// Search and AI answer engines are welcome on every public page — being
// quoted by them is the point of the marketing pages (GEO). Private app
// areas and the API stay out of every index.
const PRIVATE = ["/api/", "/dashboard", "/studio", "/jobs/", "/clips/", "/auth/"];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: PRIVATE },
      ...["GPTBot", "OAI-SearchBot", "ChatGPT-User", "ClaudeBot", "Claude-SearchBot", "PerplexityBot", "Google-Extended", "Applebot-Extended"].map(
        (userAgent) => ({ userAgent, allow: "/", disallow: PRIVATE }),
      ),
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
    host: absoluteUrl("/"),
  };
}
