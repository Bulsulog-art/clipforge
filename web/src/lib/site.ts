/**
 * Public facts about the product, in one place: where it lives and what it
 * costs. Marketing pages, metadata, structured data, the sitemap and
 * llms.txt all read from here, so a domain move is one env change
 * (NEXT_PUBLIC_APP_URL) and a price change cannot leave a stale number on
 * some page — which is exactly what happened before ($5.99 and $14.99 lived
 * on for months after the plans changed).
 *
 * Prices must match lib/revenuecat-products and the Dodo products.
 */

export const SITE_URL = (process.env.NEXT_PUBLIC_APP_URL || "https://clipforge.bulsulabs.com").replace(
  /\/+$/,
  "",
);

export const SITE_NAME = "ClipForge";

export const PRICING = {
  weekly: { price: "$6.99", amount: 6.99, credits: 30, label: "Plus weekly" },
  yearly: { price: "$49.99", amount: 49.99, credits: 1200, perMonth: "about $4.17", label: "Plus yearly" },
  topup: { price: "$4.99", amount: 4.99, credits: 40 },
  free: { sourceMinutes: 5 },
  plus: { sourceMinutes: 90 },
} as const;

export function absoluteUrl(path = "/"): string {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}
