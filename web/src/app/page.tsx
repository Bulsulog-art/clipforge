import Link from "next/link";
import { ArrowRight, Sparkles, Scissors, Send, BarChart3, Zap, Globe } from "lucide-react";

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
          AI viral clip studio · podcast → 100+ clips
        </div>
        <h1 className="mx-auto max-w-4xl text-5xl font-bold tracking-tight md:text-7xl">
          One long video.<br />
          <span className="gradient-text">100+ viral clips.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
          Drop a YouTube link or upload your podcast — ClipForge finds the moments people share,
          adds animated captions, hooks, B-roll, then posts them to TikTok, Reels and Shorts on autopilot.
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

      <section className="container grid gap-6 py-20 md:grid-cols-3">
        <Feature
          icon={<Scissors />}
          title="Viral moment detection"
          body="Whisper transcribes, GPT-4o-mini scores. Top 8–30 moments become clips, sorted by viral potential."
        />
        <Feature
          icon={<Sparkles />}
          title="Studio-grade render"
          body="Hooks, animated captions, jump cuts, B-roll, music, audio normalization — every clip ships polished."
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
        <Feature
          icon={<BarChart3 />}
          title="What works for you"
          body="Cross-platform analytics. We learn your audience and bias toward formats that ship."
        />
        <Feature
          icon={<Globe />}
          title="Multi-language"
          body="Generate captions in 40+ languages. Reach audiences your competitors can't."
        />
      </section>

      <section id="pricing" className="container py-20">
        <h2 className="text-center text-4xl font-bold">Honest pricing.</h2>
        <p className="mt-2 text-center text-muted-foreground">No usage credits theater. Cancel anytime.</p>

        <div className="mt-12 grid gap-6 md:grid-cols-4">
          <PlanCard name="Free" price="$0" body="Try the magic." features={["2 videos / month", "5 clips per video", "Watermark", "Manual export"]} />
          <PlanCard name="Starter" price="$29" body="Solo creator." features={["10 videos", "Unlimited clips", "No watermark", "All export formats"]} />
          <PlanCard name="Pro" price="$79" highlight body="Pro creator + auto-post." features={["50 videos", "Auto-post to all platforms", "A/B hook testing", "Brand kits", "Analytics"]} />
          <PlanCard name="Agency" price="$199" body="Agencies & teams." features={["250 videos", "5 team members", "White-label exports", "API access", "Priority support"]} />
        </div>
      </section>

      <footer className="container border-t border-border/50 py-10 text-sm text-muted-foreground">
        <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
          <span>© {new Date().getFullYear()} Bulsu Labs · ClipForge</span>
          <div className="flex gap-4">
            <Link href="/legal/terms">Terms</Link>
            <Link href="/legal/privacy">Privacy</Link>
            <a href="mailto:hello@clipforge.bulsulabs.com">Contact</a>
          </div>
        </div>
      </footer>
    </main>
  );
}

function Feature({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-border/50 bg-card/40 p-6 backdrop-blur-sm transition hover:border-brand/40">
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-brand/10 text-brand">{icon}</div>
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{body}</p>
    </div>
  );
}

function PlanCard({
  name, price, body, features, highlight,
}: { name: string; price: string; body: string; features: string[]; highlight?: boolean }) {
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
        <span className="text-base font-normal text-muted-foreground">/mo</span>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{body}</p>
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
        {name === "Free" ? "Start free" : `Choose ${name}`}
      </Link>
    </div>
  );
}
