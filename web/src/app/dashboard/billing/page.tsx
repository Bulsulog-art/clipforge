import { redirect } from "next/navigation";
import { Check, Sparkles, Zap } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { DashboardNav } from "@/components/dashboard-nav";

// Pricing model: ONE Plus subscription + consumable credit packs.
// Product IDs MUST match the RevenueCat webhook + checkout allowlist.
const PLUS_PLANS = [
  {
    product: "clipforge_plus_monthly",
    name: "Plus Monthly",
    price: "$14.99",
    cadence: "/mo",
    credits: "40 credits / month",
    highlight: true,
  },
  {
    product: "clipforge_plus_yearly",
    name: "Plus Yearly",
    price: "$59.99",
    cadence: "/yr",
    credits: "500 credits / year",
    note: "Best value — ~$0.12/credit",
  },
  {
    product: "clipforge_plus_weekly",
    name: "Plus Weekly",
    price: "$5.99",
    cadence: "/wk",
    credits: "10 credits / week",
  },
];

const PLUS_FEATURES = [
  "Auto-post to TikTok, Reels & Shorts",
  "Unlimited clips, no watermark",
  "AI translate & voice clone",
  "Credits refill every billing cycle",
];

const CREDIT_PACKS = [
  { product: "clipforge_credits_booster", name: "Booster", price: "$9.99", credits: 10 },
  { product: "clipforge_credits_power", name: "Power", price: "$19.99", credits: 30 },
  { product: "clipforge_credits_pro", name: "Pro Pack", price: "$49.99", credits: 80, best: true },
];

export default async function BillingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  const isPlus = (profile?.tier ?? "free") !== "free";
  const credits = (profile?.credits_balance as number | undefined) ?? 0;

  return (
    <div className="min-h-screen bg-background">
      <DashboardNav profile={profile ?? null} />

      <main className="container max-w-5xl py-10">
        <h1 className="text-3xl font-bold text-foreground">Billing</h1>
        <div className="mt-2 flex flex-wrap items-center gap-x-6 gap-y-1 text-sm text-muted-foreground">
          <span>
            Plan:{" "}
            <span className="font-medium text-foreground">{isPlus ? "Plus" : "Free"}</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-brand" />
            <span className="font-medium text-foreground">{credits}</span> credits
          </span>
        </div>

        {/* Plus subscription */}
        <section className="mt-8">
          <h2 className="text-lg font-semibold">
            {isPlus ? "Your Plus subscription" : "Go Plus"}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            One subscription unlocks auto-posting and refills your credits every cycle.
          </p>

          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {PLUS_FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand" /> {f}
              </li>
            ))}
          </ul>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {PLUS_PLANS.map((p) => (
              <div
                key={p.product}
                className={`relative rounded-2xl border p-6 shadow-sm transition hover:shadow-md ${
                  p.highlight ? "border-brand bg-brand/5 ring-1 ring-brand/40" : "border-border bg-card"
                }`}
              >
                {p.highlight && (
                  <span className="absolute -top-3 left-6 rounded-full bg-brand px-3 py-1 text-xs font-medium text-white">
                    Most popular
                  </span>
                )}
                <h3 className="text-lg font-semibold text-foreground">{p.name}</h3>
                <div className="mt-2 text-3xl font-bold text-foreground">
                  {p.price}
                  <span className="text-base font-normal text-muted-foreground">{p.cadence}</span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{p.credits}</p>
                {p.note && <p className="mt-1 text-xs text-brand">{p.note}</p>}
                <a
                  href={`/api/billing/checkout?product=${p.product}`}
                  className={`mt-5 block rounded-full px-4 py-2.5 text-center text-sm font-medium outline-none transition focus-visible:ring-2 focus-visible:ring-brand/40 ${
                    p.highlight
                      ? "bg-brand text-white hover:bg-brand-glow"
                      : "border border-border bg-card text-foreground hover:bg-accent"
                  }`}
                >
                  {isPlus ? "Switch to this" : "Choose"}
                </a>
              </div>
            ))}
          </div>
        </section>

        {/* Credit packs */}
        <section className="mt-12">
          <h2 className="text-lg font-semibold text-foreground">Top up credits</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            One-time packs for when you need credits right now. Credits never expire.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            {CREDIT_PACKS.map((pack) => (
              <div
                key={pack.product}
                className={`flex items-center justify-between rounded-2xl border p-5 shadow-sm transition hover:shadow-md ${
                  pack.best ? "border-brand/40 bg-brand/5" : "border-border bg-card"
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-brand" />
                    <span className="text-2xl font-bold text-foreground">{pack.credits}</span>
                    <span className="text-sm text-muted-foreground">credits</span>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">{pack.name}</div>
                </div>
                <a
                  href={`/api/billing/checkout?product=${pack.product}`}
                  className="rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-foreground outline-none transition hover:bg-accent focus-visible:ring-2 focus-visible:ring-brand/40"
                >
                  {pack.price}
                </a>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
