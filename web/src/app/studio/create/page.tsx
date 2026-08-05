import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { DashboardNav } from "@/components/dashboard-nav";
import { CreateForm } from "@/components/generate/create-form";

export const metadata = {
  title: "Make a video from a sentence · ClipForge",
  description:
    "Describe the video you want. ClipForge writes the shots, finds the footage, animates the type and hands you an mp4.",
};

export default async function CreateVideoPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();

  return (
    <div className="min-h-screen bg-background">
      <DashboardNav profile={profile ?? null} />

      <main className="container max-w-5xl py-10">
        <Link
          href="/dashboard"
          className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to studio
        </Link>

        <h1 className="text-3xl font-bold text-foreground sm:text-4xl">Describe it. We&apos;ll shoot it.</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Type what the video should say. We write the shot list, pull the footage, animate the type and hand you an
          mp4 that&apos;s ready to post — no timeline, no editing.
        </p>

        <div className="mt-10">
          <CreateForm
            credits={profile?.credits_balance ?? 0}
            tier={(profile?.tier as string | undefined) ?? "free"}
          />
        </div>
      </main>
    </div>
  );
}
