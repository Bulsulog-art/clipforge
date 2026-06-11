"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Scissors, LogOut, BarChart3 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/supabase/types";

export function DashboardNav({ profile }: { profile: Profile | null }) {
  const router = useRouter();
  const supabase = createClient();

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-card/80 backdrop-blur">
      <div className="container flex items-center justify-between py-4">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 font-semibold text-foreground transition hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 rounded-md"
        >
          <Scissors className="h-5 w-5 text-brand" />
          ClipForge
        </Link>

        <nav className="hidden items-center gap-6 text-sm sm:flex">
          <Link href="/dashboard" className="font-medium text-foreground transition hover:text-brand">Studio</Link>
          <Link href="/dashboard/social" className="text-muted-foreground transition hover:text-foreground">Channels</Link>
          <Link href="/dashboard/analytics" className="inline-flex items-center gap-1.5 text-muted-foreground transition hover:text-foreground">
            <BarChart3 className="h-3.5 w-3.5" /> Analytics
          </Link>
          <Link href="/dashboard/billing" className="text-muted-foreground transition hover:text-foreground">Billing</Link>
        </nav>

        <div className="flex items-center gap-3">
          <span className="hidden text-xs text-muted-foreground sm:inline">{profile?.email}</span>
          <button
            onClick={signOut}
            className="rounded-md p-2 text-muted-foreground transition hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
            aria-label="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
