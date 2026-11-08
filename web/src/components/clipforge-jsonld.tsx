import { SITE_URL, PRICING } from "@/lib/site";

// ClipForge's SoftwareApplication structured data. Rendered only on ClipForge
// pages (not in the root layout) so DentVideo pages describe only DentVideo.
// No fake ratings.
const JSON_LD = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "ClipForge",
  applicationCategory: "MultimediaApplication",
  operatingSystem: "iOS, Web",
  description:
    "AI clip studio: turn a long video or podcast into captioned, ranked vertical clips you can download and post anywhere.",
  url: SITE_URL,
  offers: [
    { "@type": "Offer", name: "Free", price: "0", priceCurrency: "USD" },
    { "@type": "Offer", name: "Plus (weekly)", price: String(PRICING.weekly.amount), priceCurrency: "USD" },
    { "@type": "Offer", name: "Plus (yearly)", price: String(PRICING.yearly.amount), priceCurrency: "USD" },
  ],
  publisher: { "@type": "Organization", name: "Bulsu Labs", url: "https://bulsulabs.com" },
};

export function ClipForgeJsonLd() {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }} />;
}
