import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Pricing — ClipForge",
  description:
    "One free clip set to start. Plus from $5.99/week: unlimited styles, no watermark, cancel anytime.",
  alternates: { canonical: "https://clipforge.bulsulabs.com/pricing" },
};

/**
 * Public pricing page.
 *
 * Two reasons this exists beyond marketing:
 *  1. Trust. People do not subscribe from an app whose prices only appear
 *     after they have installed it and hit a paywall.
 *  2. App Store 3.1.2 wants the subscription terms — length, price, renewal —
 *     stated plainly, with Terms and Privacy reachable from the same place.
 *
 * Prices mirror the RevenueCat products (clipforge_plus_weekly / _monthly /
 * _yearly). Apple charges in the user's local currency at their own tiers, so
 * these USD figures are labelled as such rather than presented as exact.
 */

type Plan = {
  name: string;
  price: string;
  period: string;
  credits: string;
  note?: string;
  features: string[];
  highlight?: boolean;
};

const FREE: Plan = {
  name: "Free",
  price: "$0",
  period: "forever",
  credits: "1 clip set, once",
  features: [
    "Upload a video up to 5 minutes",
    "Word-by-word captions",
    "Auto-generated hook + thumbnail",
    "Watermark and a short outro on free renders",
  ],
};

const PLANS: Plan[] = [
  {
    name: "Plus weekly",
    price: "$5.99",
    period: "per week",
    credits: "10 credits every week",
    features: [
      "No watermark",
      "Sources up to 90 minutes",
      "5 caption styles, niche colour presets",
      "Clip by prompt — “only the parts where I talk about pricing”",
      "Translate a clip into 15+ languages (2 credits)",
      "Cancel anytime",
    ],
  },
  {
    name: "Plus monthly",
    price: "$14.99",
    period: "per month",
    credits: "40 credits every month",
    note: "Most popular",
    highlight: true,
    features: [
      "Everything in weekly",
      "Better value per credit",
      "Priority in the render queue",
      "Cancel anytime",
    ],
  },
  {
    name: "Plus yearly",
    price: "$59.99",
    period: "per year",
    credits: "500 credits up front",
    note: "Best value",
    features: [
      "Everything in monthly",
      "Works out to about $5 a month",
      "Credits never expire while you are subscribed",
      "Cancel anytime",
    ],
  },
];

function Check() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
         style={{ flex: "0 0 auto", marginTop: 3, opacity: 0.75 }}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function PlanCard({ plan }: { plan: Plan }) {
  return (
    <div
      style={{
        border: plan.highlight ? "2px solid #6C5CE7" : "1px solid rgba(255,255,255,0.12)",
        borderRadius: 18,
        padding: "26px 22px",
        background: plan.highlight ? "rgba(108,92,231,0.08)" : "rgba(255,255,255,0.03)",
        display: "flex",
        flexDirection: "column",
        gap: 14,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <h2 style={{ fontSize: 18, margin: 0 }}>{plan.name}</h2>
        {plan.note && (
          <span style={{
            fontSize: 11, fontWeight: 700, letterSpacing: 0.4, textTransform: "uppercase",
            padding: "3px 8px", borderRadius: 999, background: "rgba(108,92,231,0.25)",
          }}>
            {plan.note}
          </span>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
        <span style={{ fontSize: 34, fontWeight: 800 }}>{plan.price}</span>
        <span style={{ opacity: 0.6, fontSize: 14 }}>{plan.period}</span>
      </div>

      <p style={{ margin: 0, opacity: 0.85, fontSize: 14 }}>{plan.credits}</p>

      <ul style={{ listStyle: "none", padding: 0, margin: "6px 0 0", display: "grid", gap: 9 }}>
        {plan.features.map((f) => (
          <li key={f} style={{ display: "flex", gap: 9, fontSize: 14, lineHeight: 1.45, opacity: 0.9 }}>
            <Check />
            <span>{f}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function PricingPage() {
  return (
    <main style={{ maxWidth: 1040, margin: "0 auto", padding: "64px 20px 96px" }}>
      <header style={{ textAlign: "center", marginBottom: 44 }}>
        <h1 style={{ fontSize: 40, lineHeight: 1.1, margin: "0 0 14px", fontWeight: 800 }}>
          Start free. Upgrade when it pays for itself.
        </h1>
        <p style={{ opacity: 0.75, fontSize: 17, margin: 0 }}>
          Your first clip set is on us — no card, no trial timer.
        </p>
      </header>

      <div style={{
        display: "grid", gap: 18,
        gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
        marginBottom: 22,
      }}>
        <PlanCard plan={FREE} />
        {PLANS.map((p) => <PlanCard key={p.name} plan={p} />)}
      </div>

      <section style={{
        border: "1px solid rgba(255,255,255,0.10)", borderRadius: 14,
        padding: "18px 20px", fontSize: 13.5, lineHeight: 1.6, opacity: 0.8,
      }}>
        <h2 style={{ fontSize: 15, margin: "0 0 8px" }}>Subscription terms</h2>
        <p style={{ margin: "0 0 8px" }}>
          Plus is an auto-renewing subscription. Payment is charged to your Apple ID at
          confirmation of purchase. It renews for the same period and price unless you
          turn off auto-renew at least 24 hours before the current period ends. Manage or
          cancel it any time in Settings → Apple ID → Subscriptions. Prices are shown in
          USD; Apple bills in your local currency at its own price tiers.
        </p>
        <p style={{ margin: 0 }}>
          <Link href="/legal/terms" style={{ textDecoration: "underline" }}>Terms of Use</Link>
          {"  ·  "}
          <Link href="/legal/privacy" style={{ textDecoration: "underline" }}>Privacy Policy</Link>
        </p>
      </section>
    </main>
  );
}
