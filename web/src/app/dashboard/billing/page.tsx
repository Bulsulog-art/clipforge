import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardNav } from "@/components/dashboard-nav";

const PLANS = [
  { id: "starter", name: "Starter", price: 29, body: "Solo creator", features: ["10 videos / mo", "Unlimited clips", "No watermark"] },
  { id: "pro", name: "Pro", price: 79, body: "Auto-post + analytics", features: ["50 videos / mo", "Auto-post to all platforms", "Brand kits"], highlight: true },
  { id: "agency", name: "Agency", price: 199, body: "For teams", features: ["250 videos / mo", "5 team members", "API access"] },
];

export default async function BillingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  const currentTier = profile?.tier ?? "free";

  return (
    <div className="min-h-screen bg-background">
      <DashboardNav profile={profile ?? null} />

      <main className="container py-10">
        <h1 className="text-3xl font-semibold">Billing</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Current plan: <span className="font-medium text-foreground">{currentTier}</span>
        </p>

        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {PLANS.map((p) => (
            <div
              key={p.id}
              className={`relative rounded-2xl border p-6 ${
                p.highlight ? "border-brand bg-brand/5 ring-1 ring-brand/40" : "border-border/50 bg-card/40"
              }`}
            >
              {p.highlight && (
                <span className="absolute -top-3 left-6 rounded-full bg-brand px-3 py-1 text-xs font-medium text-white">
                  Most popular
                </span>
              )}
              <h3 className="text-xl font-semibold">{p.name}</h3>
              <div className="mt-2 text-4xl font-bold">
                ${p.price}<span className="text-base font-normal text-muted-foreground">/mo</span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{p.body}</p>
              <ul className="mt-6 space-y-2 text-sm">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-brand" />
                    {f}
                  </li>
                ))}
              </ul>
              <a
                href={`/api/billing/checkout?tier=${p.id}`}
                className={`mt-6 block rounded-full px-4 py-2.5 text-center text-sm font-medium ${
                  p.highlight ? "bg-brand text-white hover:bg-brand-glow" : "border border-border bg-card hover:bg-accent"
                } ${currentTier === p.id ? "pointer-events-none opacity-60" : ""}`}
              >
                {currentTier === p.id ? "Current plan" : `Upgrade to ${p.name}`}
              </a>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
