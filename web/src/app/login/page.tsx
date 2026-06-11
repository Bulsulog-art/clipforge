"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Scissors, Mail, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${location.origin}/auth/callback?redirect=${params.get("redirect") ?? "/dashboard"}` },
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Check your email for the magic link.");
  }

  async function handleGoogle() {
    setLoading(true);
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${location.origin}/auth/callback?redirect=${params.get("redirect") ?? "/dashboard"}` },
    });
  }

  return (
    <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-sm backdrop-blur">
      <Link
        href="/"
        className="mb-6 flex items-center gap-2 text-lg font-semibold text-foreground transition hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 rounded-md"
      >
        <Scissors className="h-5 w-5 text-brand" />
        ClipForge
      </Link>
      <h1 className="text-2xl font-bold text-foreground">Welcome back</h1>
      <p className="mt-1 text-sm text-muted-foreground">Sign in with a magic link or Google.</p>

      <form onSubmit={handleMagicLink} className="mt-8 space-y-3">
        <label htmlFor="email" className="block text-sm font-medium text-foreground">Email</label>
        <input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-brand/40"
          placeholder="you@studio.com"
        />
        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-brand py-2.5 text-sm font-medium text-white transition hover:bg-brand-glow disabled:opacity-60"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
          Send magic link
        </button>
      </form>

      <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        OR
        <span className="h-px flex-1 bg-border" />
      </div>

      <button
        onClick={handleGoogle}
        disabled={loading}
        className="w-full rounded-full border border-border bg-card py-2.5 text-sm font-medium text-foreground transition hover:bg-accent disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
      >
        Continue with Google
      </button>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        New here?{" "}
        <Link href="/signup" className="text-brand transition hover:underline">Create an account</Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center gradient-bg px-4">
      <Suspense
        fallback={
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Loading…
          </div>
        }
      >
        <LoginForm />
      </Suspense>
    </main>
  );
}
