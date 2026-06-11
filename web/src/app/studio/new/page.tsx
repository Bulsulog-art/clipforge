"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Link2, Upload, Loader2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

const NICHES = [
  "motivation", "business", "finance", "health", "tech", "education",
  "comedy", "fitness", "spirituality", "history", "science", "lifestyle",
];

export default function NewProjectPage() {
  const router = useRouter();
  const [tab, setTab] = useState<"url" | "upload">("url");
  const [url, setUrl] = useState("");
  const [niche, setNiche] = useState("motivation");
  const [language, setLanguage] = useState("en");
  const [clipPrompt, setClipPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  async function submitUrl() {
    if (!url.match(/youtube\.com|youtu\.be|tiktok\.com/i)) {
      return toast.error("Drop a YouTube or TikTok URL.");
    }
    setLoading(true);
    const res = await fetch("/api/jobs", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sourceType: "youtube", sourceUrl: url, niche, language, prompt: clipPrompt || undefined }),
    });
    setLoading(false);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return toast.error(err.error ?? "Failed to create job");
    }
    const { jobId } = await res.json();
    toast.success("Project created. Transcribing…");
    router.push(`/studio/${jobId}`);
  }

  async function submitUpload() {
    if (!file) return toast.error("Pick a video file.");
    setLoading(true);
    const form = new FormData();
    form.append("file", file);
    form.append("niche", niche);
    form.append("language", language);
    if (clipPrompt.trim()) form.append("prompt", clipPrompt.trim());
    const res = await fetch("/api/jobs/upload", { method: "POST", body: form });
    setLoading(false);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return toast.error(err.error ?? "Upload failed");
    }
    const { jobId } = await res.json();
    toast.success("Uploaded. Processing…");
    router.push(`/studio/${jobId}`);
  }

  return (
    <main className="container max-w-2xl py-10">
      <Link href="/dashboard" className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to studio
      </Link>

      <h1 className="text-3xl font-semibold">New project</h1>
      <p className="mt-1 text-sm text-muted-foreground">Drop a video — we&apos;ll find the moments worth sharing.</p>

      <div className="mt-8 flex gap-2 rounded-lg border border-border/50 bg-card/30 p-1">
        <button
          onClick={() => setTab("url")}
          className={`flex-1 rounded-md px-4 py-2 text-sm font-medium ${tab === "url" ? "bg-card text-foreground" : "text-muted-foreground"}`}
        >
          <Link2 className="mr-2 inline h-4 w-4" /> URL
        </button>
        <button
          onClick={() => setTab("upload")}
          className={`flex-1 rounded-md px-4 py-2 text-sm font-medium ${tab === "upload" ? "bg-card text-foreground" : "text-muted-foreground"}`}
        >
          <Upload className="mr-2 inline h-4 w-4" /> Upload
        </button>
      </div>

      <div className="mt-6 space-y-4">
        {tab === "url" ? (
          <div>
            <label className="text-sm font-medium">YouTube or TikTok URL</label>
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://youtube.com/watch?v=…"
              className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:border-brand focus:outline-none"
            />
          </div>
        ) : (
          <div>
            <label className="text-sm font-medium">Video file (mp4 / mov, ≤ 4GB)</label>
            <input
              type="file"
              accept="video/*"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
            />
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-sm font-medium">Niche</label>
            <select
              value={niche}
              onChange={(e) => setNiche(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
            >
              {NICHES.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium">Language</label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
            >
              <option value="en">English</option>
              <option value="tr">Türkçe</option>
              <option value="es">Español</option>
              <option value="fr">Français</option>
              <option value="de">Deutsch</option>
              <option value="pt">Português</option>
            </select>
          </div>
        </div>

        <div>
          <label className="text-sm font-medium">
            What to clip <span className="font-normal text-muted-foreground">· optional</span>
          </label>
          <input
            value={clipPrompt}
            onChange={(e) => setClipPrompt(e.target.value)}
            maxLength={280}
            placeholder='e.g. "every time I talk about pricing" or "just the funny moments"'
            className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
          />
          <p className="mt-1.5 text-xs text-muted-foreground">
            Leave empty and ClipForge finds your most viral moments automatically. Add a brief to clip exactly what you want.
          </p>
        </div>

        <button
          onClick={tab === "url" ? submitUrl : submitUpload}
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-brand py-3 text-sm font-medium text-white hover:bg-brand-glow disabled:opacity-60"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {loading ? "Processing…" : "Generate clips"}
        </button>
      </div>
    </main>
  );
}
