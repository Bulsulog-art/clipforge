"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Sparkles, Scissors, Send, BarChart3, Zap, Globe, Users2, Languages } from "lucide-react";

export default function LandingPage() {
  return (
    <main className="min-h-screen gradient-bg">
      <nav className="container flex items-center justify-between py-6">
        <Link href="/" className="flex items-center gap-2 text-lg font-semibold">
          <Scissors className="h-5 w-5 text-brand" />
          ClipForge
        </Link>
        <div className="flex items-center gap-4 text-sm">
          <Link href="#pricing" className="text-muted-foreground hover:text-foreground">Pricing</Link>
          <Link href="/login" className="text-muted-foreground hover:text-foreground">Log in</Link>
          <Link
            href="/signup"
            className="rounded-full bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-glow"
          >
            Start free
          </Link>
        </div>
      </nav>

      <section className="container py-20 text-center">
        <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-border/50 bg-card/50 px-4 py-1.5 text-xs text-muted-foreground backdrop-blur">
          <Sparkles className="h-3.5 w-3.5 text-brand" />
          AI viral clip studio · long video → a dozen ready-to-post clips
        </div>
        <h1 className="mx-auto max-w-4xl text-5xl font-bold tracking-tight md:text-7xl">
          One long video.<br />
          <span className="gradient-text">A dozen viral clips.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
          Drop a YouTube link or upload your podcast — ClipForge finds the moments people share,
          adds animated word-by-word captions and scroll-stopping hooks, then posts them to
          TikTok, Reels and Shorts on autopilot.
        </p>
        <div className="mt-10 flex items-center justify-center gap-4">
          <Link
            href="/signup"
            className="group flex items-center gap-2 rounded-full bg-brand px-6 py-3 text-base font-medium text-white shadow-lg shadow-brand/30 hover:bg-brand-glow"
          >
            Try free · 2 videos
            <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
          </Link>
          <Link
            href="#demo"
            className="rounded-full border border-border bg-card/50 px-6 py-3 text-base font-medium backdrop-blur hover:bg-card"
          >
            Watch demo
          </Link>
        </div>
        <p className="mt-6 text-sm text-muted-foreground">No credit card · 5-min setup · cancel anytime</p>
      </section>

      <section className="container py-20">
        <div className="mb-12 text-center">
          <h2 className="text-4xl font-bold">Everything you need.</h2>
          <p className="mt-2 text-muted-foreground">Klap + HeyGen + Reface — one app, one price.</p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <Feature
            icon={<Scissors />}
            title="Viral moment detection"
            body="Whisper transcribes, GPT-4o-mini scores. Top 8–30 moments become clips, sorted by viral potential."
          />
          <Feature
            icon={<Sparkles />}
            title="Mr.Beast-style thumbnails"
            body="Every clip gets a bold, niche-themed thumbnail with 3-layer glow text — no design skills required."
            badge="NEW"
          />
          <Feature
            icon={<Users2 />}
            title="AI Face Swap"
            body="Upload any portrait → replace the face in your clip. SwapTok-grade fun, viral K-factor through the roof."
            badge="NEW · 2 cr"
          />
          <Feature
            icon={<Languages />}
            title="Translate to 15+ languages"
            body="One clip, sold globally. Pro adds voice clone — same person, new language, mouth-synced."
            badge="NEW · 2 cr"
          />
          <Feature
            icon={<Send />}
            title="One-click distribution"
            body="Connect TikTok, Instagram, YouTube, X. Schedule a week of content in 60 seconds."
          />
          <Feature
            icon={<Zap />}
            title="A/B hook testing"
            body="Same clip, three hooks. We post all three, kill the losers automatically. Pro plan."
          />
        </div>
      </section>

      <section id="pricing" className="container py-20">
        <h2 className="text-center text-4xl font-bold">Pick a plan that fits.</h2>
        <p className="mt-2 text-center text-muted-foreground">
          Weekly to try, monthly to save. Credits never auto-renew on consumables.
        </p>

        <PricingTabs />

        <div className="mt-10 rounded-2xl border border-border/50 bg-card/30 p-6">
          <div className="flex flex-col items-center gap-1 text-center">
            <h3 className="text-lg font-semibold">Plus-only credit packs</h3>
            <p className="max-w-xl text-sm text-muted-foreground">
              Run out of credits before the next refill? Plus members can top up instantly inside the app. One-time consumable purchases — credits never auto-renew, never expire.
            </p>
          </div>
          <div className="mx-auto mt-6 grid max-w-2xl gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-border/50 bg-card/40 p-4 text-center">
              <div className="text-2xl font-semibold">+10</div>
              <div className="text-xs text-muted-foreground">Booster</div>
              <div className="mt-2 text-lg font-bold">$9.99</div>
            </div>
            <div className="rounded-xl border border-brand bg-brand/5 p-4 text-center">
              <div className="text-2xl font-semibold">+30</div>
              <div className="text-xs text-muted-foreground">Power</div>
              <div className="mt-2 text-lg font-bold">$19.99</div>
              <div className="mt-1 text-xs text-brand">most popular</div>
            </div>
            <div className="rounded-xl border border-border/50 bg-card/40 p-4 text-center">
              <div className="text-2xl font-semibold">+80</div>
              <div className="text-xs text-muted-foreground">Pro</div>
              <div className="mt-2 text-lg font-bold">$49.99</div>
              <div className="mt-1 text-xs text-muted-foreground">$0.62 / credit</div>
            </div>
          </div>
          <p className="mt-4 text-center text-xs text-muted-foreground">
            Available only inside the iOS app — Apple consumable IAP, refund-safe.
          </p>
        </div>
      </section>

      <section className="container py-20">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-center text-4xl font-bold">Common questions.</h2>
          <p className="mt-2 text-center text-muted-foreground">
            Turn one long video into a dozen captioned, ready-to-post clips in minutes.
          </p>

          <dl className="mt-12 space-y-6">
            <Faq
              q="Is the free tier really one clip set forever?"
              a="Yes. You get one full clip set on signup — drop a YouTube link up to 5 minutes, we'll cut and caption it. After that, Plus weekly is $5.99 (10 credits a week, cancel anytime). Watermark and a 'Made with ClipForge' outro are added to free renders."
            />
            <Faq
              q="What's a credit?"
              a="1 credit = 1 video processed into clips (typically 8–15 clips). Premium AI tools cost extra credits: Face Swap 2, Translation 2, Voice clone 5, AI thumbnail enhance 1."
            />
            <Faq
              q="Why is everything in one app instead of three?"
              a="Klap + HeyGen + Reface together cost $130+ a month. We do the same job for $14.99 because the heavy AI lift (Whisper, GPT, Replicate) is shared across features. One credit pool, one paywall."
            />
            <Faq
              q="Can I cancel anytime?"
              a="Yes. Settings → Manage / cancel subscription. If you start cancelling, we'll offer Plus at $12.99/mo to keep you on. Credits you've already bought are yours — they never expire."
            />
            <Faq
              q="Will Apple refund me?"
              a="Subscriptions: Apple's standard refund rules apply (typically up to 90 days). Credit packs are consumable — once spent, they aren't refundable, but unused packs can be refunded by Apple."
            />
            <Faq
              q="Can I use this for content that doesn't belong to me?"
              a="No. You need to own the source video or have a license. We're not lawyers — but our Terms make clear you take responsibility for what you upload. Face swap on real people without consent is not allowed."
            />
            <Faq
              q="Where are clips stored?"
              a="EU-region Supabase Storage. Free-tier clips are kept for 30 days. Plus subscribers' clips live as long as the subscription does + 90 days after cancellation."
            />
            <Faq
              q="What languages can you translate to?"
              a="English, Türkçe, Español, Français, Deutsch, Português, العربية, Русский, 日本語, 한국어, Italiano, Nederlands, Polski, Bahasa Indonesia, हिन्दी. More on request."
            />
          </dl>
        </div>
      </section>

      <footer className="container border-t border-border/50 py-10 text-sm text-muted-foreground">
        <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
          <span>© {new Date().getFullYear()} Bulsu Labs · ClipForge</span>
          <div className="flex gap-4">
            <Link href="/legal/terms">Terms</Link>
            <Link href="/legal/privacy">Privacy</Link>
            <a href="mailto:hello@clipforge.bulsulabs.xyz">Contact</a>
          </div>
        </div>
      </footer>
    </main>
  );
}

function Faq({ q, a }: { q: string; a: string }) {
  return (
    <div className="rounded-2xl border border-border/50 bg-card/40 p-6 backdrop-blur-sm">
      <dt className="text-base font-semibold">{q}</dt>
      <dd className="mt-2 text-sm leading-relaxed text-muted-foreground">{a}</dd>
    </div>
  );
}

function Feature({ icon, title, body, badge }: { icon: React.ReactNode; title: string; body: string; badge?: string }) {
  return (
    <div className="relative rounded-2xl border border-border/50 bg-card/40 p-6 backdrop-blur-sm transition hover:border-brand/40">
      {badge && (
        <span className="absolute right-4 top-4 rounded-full bg-brand/15 px-2 py-0.5 text-[10px] font-medium text-brand">
          {badge}
        </span>
      )}
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-brand/10 text-brand">{icon}</div>
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{body}</p>
    </div>
  );
}

type BillingPeriod = "weekly" | "monthly" | "yearly";

function PricingTabs() {
  // Default to yearly — best per-credit deal, highest LTV, anchors the
  // visitor on the largest commitment first.
  const [period, setPeriod] = useState<BillingPeriod>("yearly");

  const free = {
    name: "Free",
    price: "$0",
    body: "One on the house.",
    features: [
      "1 free clip set (lifetime)",
      "Up to 5-minute source video",
      "Mr.Beast-style thumbnails",
      "Watermark + 'Made with ClipForge' outro",
    ],
    cta: "Try one free",
  };

  const plus = {
    name: "Plus",
    weeklyPrice: "$5.99",
    weeklyCredits: "10 credits / week",
    monthlyPrice: "$14.99",
    monthlyCredits: "40 credits / month",
    yearlyPrice: "$59.99",
    yearlyCredits: "500 credits / year",
    body: "Everything unlocked.",
    features: [
      "No watermark",
      "Animated word-by-word captions",
      "AI Face Swap (2 cr)",
      "AI Translation 15+ languages (2 cr)",
      "Voice clone (5 cr)",
      "Auto-post to TikTok, Reels, Shorts, X",
      "AI-enhanced thumbnails",
      "A/B hook testing",
      "Buy extra credit packs anytime",
      "Cancel anytime",
    ],
    cta: "Get Plus",
    highlight: true,
  };

  const priceFor = (p: BillingPeriod) =>
    p === "weekly" ? plus.weeklyPrice : p === "monthly" ? plus.monthlyPrice : plus.yearlyPrice;
  const creditsFor = (p: BillingPeriod) =>
    p === "weekly" ? plus.weeklyCredits : p === "monthly" ? plus.monthlyCredits : plus.yearlyCredits;
  const periodLabelFor = (p: BillingPeriod) =>
    p === "weekly" ? "/wk" : p === "monthly" ? "/mo" : "/yr";

  return (
    <>
      <div className="mx-auto mt-8 flex w-fit rounded-full border border-border/50 bg-card/40 p-1">
        <button
          type="button"
          onClick={() => setPeriod("weekly")}
          className={`rounded-full px-4 py-1.5 text-sm font-medium ${
            period === "weekly" ? "bg-brand text-white" : "text-muted-foreground"
          }`}
        >
          Weekly
        </button>
        <button
          type="button"
          onClick={() => setPeriod("monthly")}
          className={`rounded-full px-4 py-1.5 text-sm font-medium ${
            period === "monthly" ? "bg-brand text-white" : "text-muted-foreground"
          }`}
        >
          Monthly
        </button>
        <button
          type="button"
          onClick={() => setPeriod("yearly")}
          className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium ${
            period === "yearly" ? "bg-brand text-white" : "text-muted-foreground"
          }`}
        >
          Yearly
          <span className="rounded-full bg-brand/20 px-2 py-0.5 text-[10px] font-bold text-brand">
            Best value
          </span>
        </button>
      </div>

      <div className="mx-auto mt-10 grid max-w-3xl gap-6 md:grid-cols-2">
        <PlanCard
          name={free.name}
          price={free.price}
          body={free.body}
          features={free.features}
          cta={free.cta}
        />
        <PlanCard
          name={plus.name}
          price={priceFor(period)}
          periodLabel={periodLabelFor(period)}
          body={plus.body}
          creditsLine={creditsFor(period)}
          features={plus.features}
          highlight={plus.highlight}
          cta={plus.cta}
        />
      </div>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        About to cancel Plus? Stay for{" "}
        <span className="font-semibold text-foreground">$12.99/mo</span> instead — win-back offer.
      </p>
      <p className="mt-2 text-center text-xs text-muted-foreground">
        Need more credits in a hurry? Plus members can grab{" "}
        <span className="text-foreground">Booster +10 ($9.99)</span>,{" "}
        <span className="text-foreground">Power +30 ($19.99)</span> or{" "}
        <span className="text-foreground">Pro +80 ($49.99)</span> any time — never expires.
      </p>
    </>
  );
}

function PlanCard({
  name, price, body, features, highlight, periodLabel, creditsLine, cta,
}: {
  name: string;
  price: string;
  body: string;
  features: string[];
  highlight?: boolean;
  periodLabel?: string;
  creditsLine?: string;
  cta?: string;
}) {
  return (
    <div
      className={`relative rounded-2xl border p-6 ${
        highlight ? "border-brand bg-brand/5 ring-1 ring-brand/40" : "border-border/50 bg-card/40"
      }`}
    >
      {highlight && (
        <span className="absolute -top-3 left-6 rounded-full bg-brand px-3 py-1 text-xs font-medium text-white">
          Most popular
        </span>
      )}
      <h3 className="text-xl font-semibold">{name}</h3>
      <div className="mt-2 text-4xl font-bold">
        {price}
        {periodLabel && <span className="text-base font-normal text-muted-foreground">{periodLabel}</span>}
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{body}</p>
      {creditsLine && (
        <p className="mt-3 text-sm font-medium text-brand">{creditsLine}</p>
      )}
      <ul className="mt-6 space-y-2 text-sm">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2">
            <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-brand" />
            {f}
          </li>
        ))}
      </ul>
      <Link
        href="/signup"
        className={`mt-6 block rounded-full px-4 py-2.5 text-center text-sm font-medium ${
          highlight ? "bg-brand text-white hover:bg-brand-glow" : "border border-border bg-card hover:bg-accent"
        }`}
      >
        {cta ?? (name === "Free" ? "Start free" : `Choose ${name}`)}
      </Link>
    </div>
  );
}
