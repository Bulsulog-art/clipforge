import Link from "next/link";
import type { Metadata } from "next";
import { absoluteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "DentVideo — patient-education videos for dental clinics",
  description:
    "Turn a five-minute phone recording into a week of captioned short videos for your clinic — reviewed for clinical accuracy and health-advertising rules, approved by you. English, German, Spanish, French, Italian, Portuguese, Turkish.",
  alternates: { canonical: absoluteUrl("/dentvideo") },
  openGraph: {
    title: "DentVideo — patient-education videos for dental clinics",
    description: "Your dentist's own voice, cut into captioned short videos. Checked before you see them. Approved by you.",
    url: absoluteUrl("/dentvideo"),
    type: "website",
    siteName: "DentVideo",
  },
};

const FAQ = [
  {
    q: "Do I have to film anything?",
    a: "No, but it helps. Each week you get educational videos made for you — written, narrated and captioned in your language. If you also record five minutes of yourself talking through one of our filming cards, we turn it into short clips of you, which patients trust most.",
  },
  {
    q: "How do you keep the content accurate and within advertising rules?",
    a: "Every script and caption is checked twice: once against health-advertising rules (no guarantees, “painless”, “best”, prices, discounts, before-and-after promises or testimonials) and once by a clinical-accuracy reviewer acting as a general dentist. Anything that fails is rewritten or not made. You still approve every video before it is posted.",
  },
  {
    q: "Will you change what I say in my own recordings?",
    a: "Never. If something you said could be read as a promise or is worth a second look, the clip is marked for your attention with the reason and a suggested wording — the decision stays with you.",
  },
  {
    q: "Which languages are supported?",
    a: "English, German, Spanish, French, Italian, Portuguese and Turkish, with formal or informal address as your clinic prefers.",
  },
  {
    q: "Do you post to Instagram or TikTok for me?",
    a: "Not yet. You download approved videos with their caption and hashtags and post them yourself — which also means nothing ever goes out without you.",
  },
];

const JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "SoftwareApplication",
      name: "DentVideo",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      description:
        "Patient-education short videos for dental clinics: made from the dentist's own recording or written and narrated for them, checked for clinical accuracy and health-advertising rules, approved by the clinic.",
      url: absoluteUrl("/dentvideo"),
      publisher: { "@type": "Organization", name: "Bulsu Labs", url: "https://bulsulabs.com" },
    },
    {
      "@type": "FAQPage",
      mainEntity: FAQ.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
    },
  ],
};

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <li className="rounded-2xl border border-[#e8e1d5] bg-white p-6">
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#e6efed] font-semibold text-[#0f5c5c]">{n}</span>
      <h3 className="mt-4 text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-[#4a5a57]">{children}</p>
    </li>
  );
}

export default function DentVideoHome() {
  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }} />

      <section className="mx-auto max-w-6xl px-4 pb-16 pt-16 sm:px-6 sm:pt-24">
        <p className="text-sm font-medium uppercase tracking-[0.14em] text-[#0f5c5c]">For dental clinics</p>
        <h1 className="mt-4 max-w-3xl text-4xl font-semibold leading-[1.1] tracking-tight sm:text-6xl">
          Your patients' questions, answered by you — every week.
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-[#4a5a57]">
          DentVideo turns five minutes of you talking into a week of captioned short videos for Instagram, TikTok and
          YouTube — and writes and narrates educational videos when there is no time to film. Each one is checked for
          clinical accuracy and health-advertising rules before you see it. Nothing goes out until you approve it.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-4">
          <Link href="/dentvideo/start" className="rounded-full bg-[#0f5c5c] px-7 py-3.5 font-medium text-[#f5efe6] transition hover:bg-[#0c4a4a]">
            Start your free first week
          </Link>
          <span className="text-sm text-[#6b7a77]">No card. Seven languages.</span>
        </div>
      </section>

      <section className="border-y border-[#e8e1d5] bg-[#f3eee5]">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-14 sm:grid-cols-3 sm:px-6">
          <div>
            <h2 className="font-semibold">The problem</h2>
            <p className="mt-2 text-[#4a5a57]">Patients choose a dentist they feel they know. Posting every week takes hours you do not have, and agencies cost hundreds a month.</p>
          </div>
          <div>
            <h2 className="font-semibold">The risk</h2>
            <p className="mt-2 text-[#4a5a57]">One “painless, guaranteed” or a discount in a post can break health-advertising rules. Generic tools do not know the difference.</p>
          </div>
          <div>
            <h2 className="font-semibold">What DentVideo does</h2>
            <p className="mt-2 text-[#4a5a57]">Makes the videos, checks them like a careful colleague would, and leaves the final word to you.</p>
          </div>
        </div>
      </section>

      <section id="how" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <h2 className="text-3xl font-semibold tracking-tight">How it works</h2>
        <ol className="mt-10 grid gap-6 sm:grid-cols-3">
          <Step n={1} title="Tell us about your clinic">
            Language, services, tone, colours and logo. Two minutes, once. Videos are only ever about the services you offer.
          </Step>
          <Step n={2} title="Get the week's videos">
            Five short educational videos answering real patient questions — narrated, captioned, in your colours, each with a filming card if you would rather say it yourself.
          </Step>
          <Step n={3} title="Approve and post">
            Watch, approve or decline. Download approved videos with a ready caption and hashtags. Anything that needs your eye is marked, with the reason.
          </Step>
        </ol>
      </section>

      <section className="bg-[#0f5c5c] text-[#f5efe6]">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <h2 className="max-w-2xl text-3xl font-semibold tracking-tight">Checked twice before you see it</h2>
          <div className="mt-10 grid gap-8 sm:grid-cols-3">
            <div>
              <h3 className="font-semibold">Advertising rules</h3>
              <p className="mt-2 text-[#cfe2df]">No guarantees, “painless”, “permanent”, “best”, prices, discounts, before-and-after promises or testimonials — caught in seven languages.</p>
            </div>
            <div>
              <h3 className="font-semibold">Clinical accuracy</h3>
              <p className="mt-2 text-[#cfe2df]">A reviewer acting as a general dentist checks every statement against mainstream guidance — and that advice belongs to the right procedure.</p>
            </div>
            <div>
              <h3 className="font-semibold">Sound and picture</h3>
              <p className="mt-2 text-[#cfe2df]">Every video is measured before delivery: narration present and audible, no silent gaps or black frames, the right size for each platform.</p>
            </div>
          </div>
        </div>
      </section>

      <section id="pricing" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <h2 className="text-3xl font-semibold tracking-tight">Start with a free week</h2>
        <p className="mt-3 max-w-2xl text-[#4a5a57]">
          Your first week of videos is free, with no card. Founding clinics get introductory pricing when plans open.
        </p>
        <Link href="/dentvideo/start" className="mt-8 inline-block rounded-full bg-[#0f5c5c] px-7 py-3.5 font-medium text-[#f5efe6] transition hover:bg-[#0c4a4a]">
          Start your free first week
        </Link>
      </section>

      <section className="mx-auto max-w-3xl px-4 pb-24 sm:px-6">
        <h2 className="text-3xl font-semibold tracking-tight">Questions</h2>
        <dl className="mt-8 space-y-6">
          {FAQ.map((f) => (
            <div key={f.q} className="border-b border-[#e8e1d5] pb-6">
              <dt className="font-semibold">{f.q}</dt>
              <dd className="mt-2 text-[#4a5a57]">{f.a}</dd>
            </div>
          ))}
        </dl>
      </section>
    </main>
  );
}
