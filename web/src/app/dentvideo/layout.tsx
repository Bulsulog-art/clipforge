import type { Metadata } from "next";
import Link from "next/link";
import { DvMark } from "@/components/dentvid/mark";

export const metadata: Metadata = {
  title: { default: "DentVideo — patient-education videos for dental clinics", template: "%s · DentVideo" },
  description:
    "DentVideo turns a dentist's five-minute phone recording into a week of captioned, compliant short videos — and writes, narrates and checks educational videos when there is no time to film.",
};

export default function DentVideoLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#faf7f2] text-[#14211f] antialiased">
      <header className="border-b border-[#e8e1d5] bg-[#faf7f2]/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/dentvideo" className="rounded-md outline-none focus-visible:ring-2 focus-visible:ring-[#0f5c5c]/40">
            <DvMark className="text-lg" />
          </Link>
          <nav className="flex items-center gap-5 text-sm">
            <Link href="/dentvideo#how" className="hidden text-[#4a5a57] hover:text-[#14211f] sm:inline">How it works</Link>
            <Link href="/dentvideo#pricing" className="hidden text-[#4a5a57] hover:text-[#14211f] sm:inline">Pricing</Link>
            <Link href="/dentvideo/app" className="rounded-full bg-[#0f5c5c] px-4 py-2 font-medium text-[#f5efe6] transition hover:bg-[#0c4a4a]">
              Open app
            </Link>
          </nav>
        </div>
      </header>
      {children}
      <footer className="border-t border-[#e8e1d5]">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-8 text-sm text-[#4a5a57] sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <DvMark />
          <p>© {new Date().getFullYear()} Bulsu Labs. Content is reviewed by software and approved by your dentist before publishing.</p>
        </div>
      </footer>
    </div>
  );
}
