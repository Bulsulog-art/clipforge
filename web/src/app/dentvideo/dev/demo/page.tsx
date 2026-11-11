import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DemoPage, DEMO_ROBOTS } from "@/components/dentvid/demo-page";
import { AdminDemos, type AdminDemoRow } from "@/components/dentvid/admin-demos";
import { asLocale } from "@/lib/dentvid/locale";
import type { Locale } from "@/content/dentvideo";
import { DEMO_PALETTE } from "@/lib/dentvid/demos";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Demo link preview", robots: DEMO_ROBOTS };

const CLINIC: Record<Locale, { name: string; city: string; country: string }> = {
  en: { name: "Riverside Dental", city: "Bristol", country: "GB" },
  de: { name: "Zahnarztpraxis am Park", city: "München", country: "DE" },
  es: { name: "Clínica Dental Sonrisa", city: "Valencia", country: "ES" },
  tr: { name: "Gülümse Diş Kliniği", city: "İzmir", country: "TR" },
  fr: { name: "Cabinet Dentaire du Parc", city: "Lyon", country: "FR" },
  ja: { name: "さくら歯科クリニック", city: "横浜市", country: "JP" },
  ar: { name: "عيادة الابتسامة لطب الأسنان", city: "دبي", country: "AE" },
  pl: { name: "Gabinet Stomatologiczny Uśmiech", city: "Kraków", country: "PL" },
};

/**
 * Dev-only: a personalised demo page (and the owner's demo list) from fake
 * data, for design review and screenshots. 404 unless DENTVIDEO_DEV_PREVIEW=1.
 *
 *   /dentvideo/dev/demo?lang=tr            the public demo page in Turkish
 *   /dentvideo/dev/demo?lang=ar&logo=0     without a logo
 *   /dentvideo/dev/demo?admin=1            /admin/demos with a few demos
 */
export default async function DemoPreviewPage({ searchParams }: { searchParams: Promise<{ lang?: string; logo?: string; admin?: string; founding?: string }> }) {
  if (process.env.DENTVIDEO_DEV_PREVIEW !== "1") notFound();
  const sp = await searchParams;
  const locale = asLocale(sp.lang) ?? "en";
  const c = CLINIC[locale];
  if (sp.admin) {
    const now = new Date();
    const d = (days: number) => new Date(now.getTime() + days * 86_400_000).toISOString();
    const rows: AdminDemoRow[] = (["tr", "tr", "es", "de"] as Locale[]).map((l, i) => ({
      token: ["Ab3dE5fG7hJ", "Kq9WmZ2xT4p", "Rt5Yu8Io1Pa", "Zx7Cv3Bn6Mq"][i],
      clinic_name: CLINIC[l].name,
      city: CLINIC[l].city,
      country: CLINIC[l].country,
      language: l,
      colour: DEMO_PALETTE[i],
      logo_path: i % 2 ? null : `demos/x.png`,
      note: i === 0 ? "Instagram DM, replied yes" : null,
      campaign: l === "tr" ? "tr-launch" : `${l}-launch`,
      created_at: d(-10 + i),
      expires_at: d(50 + i),
      disabled: i === 3,
      view_count: [7, 2, 0, 1][i],
      last_viewed_at: i === 2 ? null : d(-1),
      url: `https://dentvideo.com/${l}/d/${["Ab3dE5fG7hJ", "Kq9WmZ2xT4p", "Rt5Yu8Io1Pa", "Zx7Cv3Bn6Mq"][i]}`,
      stats: { views: [7, 2, 0, 1][i], played: [5, 1, 0, 0][i], ctaClicks: [2, 0, 0, 0][i], signups: [1, 0, 0, 0][i], paid: [1, 0, 0, 0][i] },
    }));
    return <AdminDemos available={sp.admin !== "missing"} demos={rows} now={now.toISOString()} backHref="/dentvideo/dev/admin" foundingOpen />;
  }
  return (
    <DemoPage
      locale={locale}
      demo={{ token: "Ab3dE5fG7hJ", clinicName: c.name, city: c.city, country: c.country, language: locale, colour: "#1f4e79", hasLogo: sp.logo !== "0", campaign: "tr-launch" }}
      foundingOpen={sp.founding !== "0"}
      logoSrc="/dentvideo/icon-512.png"
    />
  );
}
